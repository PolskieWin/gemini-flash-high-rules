export type DisposeReason = 'evicted' | 'expired' | 'deleted' | 'replaced' | 'cleared';

export type DisposeCallback<K, V> = (key: K, value: V, reason: DisposeReason) => void;

export interface LruCacheOptions<K, V> {
  /** Maximum number of items the cache can hold. Must be an integer greater than 0. */
  maxSize: number;
  /** Default Time-To-Live in milliseconds. Must be greater than 0 if specified. */
  defaultTtlMs?: number;
  /** Optional interval in milliseconds to automatically purge expired entries in the background. */
  cleanupIntervalMs?: number;
  /** Callback fired whenever an entry is evicted, expired, replaced, deleted, or cleared. */
  onDispose?: DisposeCallback<K, V>;
  /** Custom clock provider, defaults to Date.now. Useful for testing. */
  timeProvider?: () => number;
}

export interface SetOptions {
  /** Time-To-Live for this specific item in milliseconds. Overrides defaultTtlMs. */
  ttlMs?: number;
}

interface CacheNode<K, V> {
  key: K;
  value: V;
  /** Timestamp in ms when the node expires, or null if it never expires. */
  expiresAt: number | null;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
}

/**
 * High-performance in-memory LRU (Least Recently Used) cache with
 * per-item TTL expiration and eviction notifications.
 *
 * Backed by a Map for O(1) key lookups and a doubly linked list
 * with sentinel nodes for O(1) eviction and recency updates.
 */
export class LruCache<K, V> implements Iterable<[K, V]> {
  private _maxSize: number;
  private readonly defaultTtlMs?: number;
  private readonly onDispose?: DisposeCallback<K, V>;
  private readonly timeProvider: () => number;

  private readonly map: Map<K, CacheNode<K, V>>;
  private readonly head: CacheNode<K, V>; // Sentinel: head.next is MRU
  private readonly tail: CacheNode<K, V>; // Sentinel: tail.prev is LRU

  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private isDisposed = false;

  constructor(options: LruCacheOptions<K, V>) {
    if (!Number.isInteger(options.maxSize) || options.maxSize <= 0) {
      throw new RangeError(`maxSize must be a positive integer, received: ${options.maxSize}`);
    }

    if (options.defaultTtlMs !== undefined && (typeof options.defaultTtlMs !== 'number' || options.defaultTtlMs <= 0 || Number.isNaN(options.defaultTtlMs))) {
      throw new RangeError(`defaultTtlMs must be a positive number, received: ${options.defaultTtlMs}`);
    }

    if (options.cleanupIntervalMs !== undefined && (typeof options.cleanupIntervalMs !== 'number' || options.cleanupIntervalMs <= 0 || Number.isNaN(options.cleanupIntervalMs))) {
      throw new RangeError(`cleanupIntervalMs must be a positive number, received: ${options.cleanupIntervalMs}`);
    }

    this._maxSize = options.maxSize;
    this.defaultTtlMs = options.defaultTtlMs;
    this.onDispose = options.onDispose;
    this.timeProvider = options.timeProvider ?? Date.now;
    this.map = new Map();

    // Initialize sentinels
    this.head = {
      key: undefined as unknown as K,
      value: undefined as unknown as V,
      expiresAt: null,
      prev: null,
      next: null,
    };
    this.tail = {
      key: undefined as unknown as K,
      value: undefined as unknown as V,
      expiresAt: null,
      prev: null,
      next: null,
    };
    this.head.next = this.tail;
    this.tail.prev = this.head;

    if (options.cleanupIntervalMs) {
      this.cleanupTimer = setInterval(() => {
        this.purgeStale();
      }, options.cleanupIntervalMs);

      // In Node.js environments, unref timer so it does not block process exit
      if (typeof this.cleanupTimer === 'object' && this.cleanupTimer !== null && 'unref' in this.cleanupTimer) {
        (this.cleanupTimer as { unref: () => void }).unref();
      }
    }
  }

  /**
   * Maximum capacity of the cache.
   */
  public get maxSize(): number {
    return this._maxSize;
  }

  /**
   * Number of items currently stored in the cache (including any unpurged stale items).
   */
  public get size(): number {
    return this.map.size;
  }

  /**
   * Stores a key-value pair in the cache with optional per-item TTL.
   * If the key already exists, updates value and TTL, and promotes the entry to MRU.
   * If cache is at capacity, evicts the least recently used item.
   */
  public set(key: K, value: V, options?: SetOptions): this {
    this.assertNotDisposed();

    const ttl = options?.ttlMs ?? this.defaultTtlMs;
    if (ttl !== undefined && (typeof ttl !== 'number' || ttl <= 0 || Number.isNaN(ttl))) {
      throw new RangeError(`ttlMs must be a positive number, received: ${ttl}`);
    }

    const now = this.timeProvider();
    const expiresAt = ttl !== undefined && Number.isFinite(ttl) ? now + ttl : null;

    const existingNode = this.map.get(key);

    if (existingNode !== undefined) {
      const oldValue = existingNode.value;
      existingNode.value = value;
      existingNode.expiresAt = expiresAt;

      this.moveToHead(existingNode);

      if (this.onDispose) {
        this.onDispose(key, oldValue, 'replaced');
      }

      return this;
    }

    // New node: check if at capacity
    if (this.map.size >= this._maxSize) {
      this.evictLru();
    }

    const newNode: CacheNode<K, V> = {
      key,
      value,
      expiresAt,
      prev: null,
      next: null,
    };

    this.insertAtHead(newNode);
    this.map.set(key, newNode);

    return this;
  }

  /**
   * Retrieves a value by key and promotes it to most recently used.
   * If expired, removes the item and returns undefined.
   */
  public get(key: K): V | undefined {
    this.assertNotDisposed();

    const node = this.map.get(key);
    if (!node) {
      return undefined;
    }

    if (this.isExpired(node)) {
      this.deleteNode(node, 'expired');
      return undefined;
    }

    this.moveToHead(node);
    return node.value;
  }

  /**
   * Retrieves a value without updating its LRU recency status.
   * If expired, lazily evicts the item and returns undefined.
   */
  public peek(key: K): V | undefined {
    this.assertNotDisposed();

    const node = this.map.get(key);
    if (!node) {
      return undefined;
    }

    if (this.isExpired(node)) {
      this.deleteNode(node, 'expired');
      return undefined;
    }

    return node.value;
  }

  /**
   * Checks whether an unexpired key exists in the cache.
   * Does not update recency status.
   */
  public has(key: K): boolean {
    this.assertNotDisposed();

    const node = this.map.get(key);
    if (!node) {
      return false;
    }

    if (this.isExpired(node)) {
      this.deleteNode(node, 'expired');
      return false;
    }

    return true;
  }

  /**
   * Removes an item by key.
   * Returns true if the key existed and was deleted, false otherwise.
   */
  public delete(key: K): boolean {
    this.assertNotDisposed();

    const node = this.map.get(key);
    if (!node) {
      return false;
    }

    this.deleteNode(node, 'deleted');
    return true;
  }

  /**
   * Returns remaining TTL in milliseconds for the given key,
   * `Infinity` if item has no expiration,
   * or `undefined` if key does not exist or has expired.
   */
  public getRemainingTtl(key: K): number | undefined {
    this.assertNotDisposed();

    const node = this.map.get(key);
    if (!node) {
      return undefined;
    }

    if (this.isExpired(node)) {
      this.deleteNode(node, 'expired');
      return undefined;
    }

    if (node.expiresAt === null) {
      return Infinity;
    }

    return Math.max(0, node.expiresAt - this.timeProvider());
  }

  /**
   * Manually changes the maximum capacity of the cache.
   * If resized downward, evicts excess least recently used entries.
   */
  public resize(newMaxSize: number): void {
    this.assertNotDisposed();

    if (!Number.isInteger(newMaxSize) || newMaxSize <= 0) {
      throw new RangeError(`newMaxSize must be a positive integer, received: ${newMaxSize}`);
    }

    this._maxSize = newMaxSize;

    while (this.map.size > this._maxSize) {
      this.evictLru();
    }
  }

  /**
   * Iterates through the cache and purges all expired entries.
   * Returns the total count of purged items.
   */
  public purgeStale(): number {
    this.assertNotDisposed();

    let purgedCount = 0;
    let curr = this.tail.prev;

    // Scan LRU to MRU for stale items
    while (curr && curr !== this.head) {
      const prevNode = curr.prev;
      if (this.isExpired(curr)) {
        this.deleteNode(curr, 'expired');
        purgedCount++;
      }
      curr = prevNode;
    }

    return purgedCount;
  }

  /**
   * Clears all entries from the cache.
   */
  public clear(): void {
    this.assertNotDisposed();

    if (this.onDispose) {
      for (const node of this.map.values()) {
        this.onDispose(node.key, node.value, 'cleared');
      }
    }

    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Stops background timers and releases all stored data.
   */
  public destroy(): void {
    if (this.isDisposed) {
      return;
    }

    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.clear();
    this.isDisposed = true;
  }

  /**
   * Yields [key, value] pairs ordered from most recently used to least recently used.
   * Expired entries encountered during traversal are lazily pruned.
   */
  public *[Symbol.iterator](): IterableIterator<[K, V]> {
    yield* this.entries();
  }

  /**
   * Yields [key, value] pairs from MRU to LRU.
   */
  public *entries(): IterableIterator<[K, V]> {
    this.assertNotDisposed();

    let curr = this.head.next;
    while (curr && curr !== this.tail) {
      const nextNode = curr.next;
      if (this.isExpired(curr)) {
        this.deleteNode(curr, 'expired');
      } else {
        yield [curr.key, curr.value];
      }
      curr = nextNode;
    }
  }

  /**
   * Yields keys from MRU to LRU.
   */
  public *keys(): IterableIterator<K> {
    for (const [key] of this.entries()) {
      yield key;
    }
  }

  /**
   * Yields values from MRU to LRU.
   */
  public *values(): IterableIterator<V> {
    for (const [, value] of this.entries()) {
      yield value;
    }
  }

  // --- Private Linked List & Helper Methods ---

  private isExpired(node: CacheNode<K, V>): boolean {
    if (node.expiresAt === null) {
      return false;
    }
    return this.timeProvider() >= node.expiresAt;
  }

  private insertAtHead(node: CacheNode<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;
    if (this.head.next) {
      this.head.next.prev = node;
    }
    this.head.next = node;
  }

  private detachNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    node.prev = null;
    node.next = null;
  }

  private moveToHead(node: CacheNode<K, V>): void {
    this.detachNode(node);
    this.insertAtHead(node);
  }

  private deleteNode(node: CacheNode<K, V>, reason: DisposeReason): void {
    // Detach from doubly linked list and remove from map before calling hook
    this.detachNode(node);
    this.map.delete(node.key);

    if (this.onDispose) {
      this.onDispose(node.key, node.value, reason);
    }
  }

  private evictLru(): void {
    const lruNode = this.tail.prev;
    if (!lruNode || lruNode === this.head) {
      return;
    }

    const reason: DisposeReason = this.isExpired(lruNode) ? 'expired' : 'evicted';
    this.deleteNode(lruNode, reason);
  }

  private assertNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('LruCache has been destroyed and cannot be accessed.');
    }
  }
}
