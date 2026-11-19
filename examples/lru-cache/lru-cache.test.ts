import assert from 'node:assert/strict';
import { LruCache } from './lru-cache.ts';
import type { DisposeReason } from './lru-cache.ts';

function createMockClock(initialTime = 1000) {
  let currentTime = initialTime;
  return {
    now: () => currentTime,
    advance: (ms: number) => {
      currentTime += ms;
    },
    setTime: (time: number) => {
      currentTime = time;
    },
  };
}

// 1. Validation & Construction
{
  assert.throws(() => new LruCache({ maxSize: 0 }), RangeError);
  assert.throws(() => new LruCache({ maxSize: -5 }), RangeError);
  assert.throws(() => new LruCache({ maxSize: 1.5 }), RangeError);
  assert.throws(() => new LruCache({ maxSize: 10, defaultTtlMs: -1 }), RangeError);
  assert.throws(() => new LruCache({ maxSize: 10, cleanupIntervalMs: 0 }), RangeError);
}

// 2. Basic CRUD operations
{
  const cache = new LruCache<string, number>({ maxSize: 3 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  assert.equal(cache.size, 3);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
  assert.equal(cache.get('nonexistent'), undefined);

  assert.equal(cache.has('a'), true);
  assert.equal(cache.has('z'), false);

  assert.equal(cache.delete('b'), true);
  assert.equal(cache.delete('b'), false);
  assert.equal(cache.size, 2);
  assert.equal(cache.get('b'), undefined);
}

// 3. LRU Eviction behavior
{
  const disposed: Array<{ key: string; value: number; reason: DisposeReason }> = [];
  const cache = new LruCache<string, number>({
    maxSize: 3,
    onDispose: (key, value, reason) => disposed.push({ key, value, reason }),
  });

  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  // Recency order (MRU -> LRU): c, b, a

  // Reading 'a' promotes it: recency order becomes a, c, b
  assert.equal(cache.get('a'), 1);

  // Inserting 'd' should evict 'b'
  cache.set('d', 4);
  assert.equal(cache.size, 3);
  assert.equal(cache.has('b'), false);
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.has('a'), true);
  assert.equal(cache.has('c'), true);
  assert.equal(cache.has('d'), true);

  assert.equal(disposed.length, 1);
  assert.deepEqual(disposed[0], { key: 'b', value: 2, reason: 'evicted' });

  // peek does not update recency: recency order is currently d, a, c
  assert.equal(cache.peek('c'), 3);
  // Adding 'e' should evict 'c' (not 'a' or 'd')
  cache.set('e', 5);
  assert.equal(cache.has('c'), false);
  assert.equal(disposed.length, 2);
  assert.deepEqual(disposed[1], { key: 'c', value: 3, reason: 'evicted' });
}

// 4. Overwriting existing keys
{
  const disposed: Array<{ key: string; value: string; reason: DisposeReason }> = [];
  const cache = new LruCache<string, string>({
    maxSize: 2,
    onDispose: (key, value, reason) => disposed.push({ key, value, reason }),
  });

  cache.set('k1', 'v1');
  cache.set('k2', 'v2');
  // Update k1
  cache.set('k1', 'v1_updated');

  assert.equal(cache.size, 2);
  assert.equal(cache.get('k1'), 'v1_updated');
  assert.equal(disposed.length, 1);
  assert.deepEqual(disposed[0], { key: 'k1', value: 'v1', reason: 'replaced' });

  // Since k1 was updated, MRU is k1, LRU is k2. Inserting k3 evicts k2.
  cache.set('k3', 'v3');
  assert.equal(cache.has('k2'), false);
  assert.equal(cache.has('k1'), true);
}

// 5. Per-item TTL and Default TTL expiration
{
  const clock = createMockClock(1000);
  const disposed: Array<{ key: string; value: number; reason: DisposeReason }> = [];

  const cache = new LruCache<string, number>({
    maxSize: 10,
    defaultTtlMs: 200,
    timeProvider: clock.now,
    onDispose: (key, value, reason) => disposed.push({ key, value, reason }),
  });

  // item with default TTL (200ms -> expires at 1200)
  cache.set('default', 10);
  // item with custom TTL (500ms -> expires at 1500)
  cache.set('custom', 20, { ttlMs: 500 });
  // item that does not expire (if we want no expiration, we could pass Infinity or omit if no defaultTtl)

  assert.equal(cache.getRemainingTtl('default'), 200);
  assert.equal(cache.getRemainingTtl('custom'), 500);

  clock.advance(100);
  assert.equal(cache.get('default'), 10);
  assert.equal(cache.get('custom'), 20);
  assert.equal(cache.getRemainingTtl('default'), 100);

  // Advance past 'default' expiration (total 250ms elapsed, now = 1250)
  clock.advance(150);

  assert.equal(cache.has('default'), false);
  assert.equal(cache.get('default'), undefined);
  assert.equal(cache.peek('default'), undefined);
  assert.equal(cache.getRemainingTtl('default'), undefined);

  // 'custom' is still alive (expires at 1500)
  assert.equal(cache.has('custom'), true);
  assert.equal(cache.get('custom'), 20);
  assert.equal(cache.getRemainingTtl('custom'), 250);

  // Advance past 'custom' expiration (now = 1501)
  clock.advance(251);
  assert.equal(cache.get('custom'), undefined);

  // Verify onDispose was invoked with 'expired'
  assert.equal(disposed.length, 2);
  assert.deepEqual(disposed[0], { key: 'default', value: 10, reason: 'expired' });
  assert.deepEqual(disposed[1], { key: 'custom', value: 20, reason: 'expired' });
}

// 6. Manual purgeStale()
{
  const clock = createMockClock(1000);
  const cache = new LruCache<string, number>({
    maxSize: 10,
    timeProvider: clock.now,
  });

  cache.set('item1', 1, { ttlMs: 100 });
  cache.set('item2', 2, { ttlMs: 300 });
  cache.set('item3', 3); // no TTL -> never expires

  assert.equal(cache.size, 3);
  clock.advance(150); // item1 expired, item2 & item3 alive

  const purged = cache.purgeStale();
  assert.equal(purged, 1);
  assert.equal(cache.size, 2);
  assert.equal(cache.has('item1'), false);
  assert.equal(cache.has('item2'), true);
  assert.equal(cache.has('item3'), true);
}

// 7. Dynamic resize
{
  const disposed: Array<{ key: string; value: number; reason: DisposeReason }> = [];
  const cache = new LruCache<string, number>({
    maxSize: 5,
    onDispose: (key, value, reason) => disposed.push({ key, value, reason }),
  });

  cache.set('1', 1);
  cache.set('2', 2);
  cache.set('3', 3);
  cache.set('4', 4);
  cache.set('5', 5);

  assert.equal(cache.size, 5);

  // Shrink to 2: should evict 1, 2, 3 (LRU items)
  cache.resize(2);
  assert.equal(cache.maxSize, 2);
  assert.equal(cache.size, 2);
  assert.deepEqual(
    disposed.map((d) => d.key),
    ['1', '2', '3']
  );
  assert.equal(cache.has('4'), true);
  assert.equal(cache.has('5'), true);

  // Expand back to 4
  cache.resize(4);
  assert.equal(cache.maxSize, 4);
  cache.set('6', 6);
  cache.set('7', 7);
  assert.equal(cache.size, 4);
}

// 8. Iteration & Lazy Expire during Iteration
{
  const clock = createMockClock(1000);
  const cache = new LruCache<string, number>({
    maxSize: 5,
    timeProvider: clock.now,
  });

  cache.set('a', 1, { ttlMs: 50 });
  cache.set('b', 2, { ttlMs: 200 });
  cache.set('c', 3, { ttlMs: 200 });
  // Order: c (MRU), b, a (LRU)

  clock.advance(100); // 'a' is now expired

  const keys = Array.from(cache.keys());
  assert.deepEqual(keys, ['c', 'b']);

  const entries = Array.from(cache.entries());
  assert.deepEqual(entries, [
    ['c', 3],
    ['b', 2],
  ]);

  const values = Array.from(cache.values());
  assert.deepEqual(values, [3, 2]);

  // 'a' was lazily removed during iteration
  assert.equal(cache.size, 2);
}

// 9. Clear & Destroy
{
  const disposed: Array<string> = [];
  const cache = new LruCache<string, number>({
    maxSize: 3,
    cleanupIntervalMs: 1000,
    onDispose: (k) => disposed.push(k),
  });

  cache.set('x', 10);
  cache.set('y', 20);

  cache.clear();
  assert.equal(cache.size, 0);
  assert.deepEqual(disposed, ['x', 'y']);

  cache.set('z', 30);
  assert.equal(cache.size, 1);

  cache.destroy();
  assert.equal(cache.size, 0);
  assert.throws(() => cache.get('z'), /destroyed/);
  assert.throws(() => cache.set('w', 40), /destroyed/);
}

// 10. Re-entrancy safety in onDispose
{
  let cacheRef: LruCache<string, number>;
  cacheRef = new LruCache<string, number>({
    maxSize: 2,
    onDispose: (_key, _val, _reason) => {
      // Accessing cache methods inside onDispose should not crash or corrupt pointers
      if (cacheRef) {
        cacheRef.has('other');
      }
    },
  });

  cacheRef.set('k1', 1);
  cacheRef.set('k2', 2);
  cacheRef.set('k3', 3); // triggers eviction of k1

  assert.equal(cacheRef.size, 2);
  assert.equal(cacheRef.has('k1'), false);
  assert.equal(cacheRef.has('k2'), true);
  assert.equal(cacheRef.has('k3'), true);
}

console.log('All tests passed successfully!');
