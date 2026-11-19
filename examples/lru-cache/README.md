# Production TypeScript LRU Cache Reference

This example showcases a production-ready, high-performance in-memory LRU cache generated under the `GEMINI.md` rules.

## Key Features

- **O(1) Lookups & Eviction**: Uses a JS `Map` combined with a doubly-linked list using sentinel head and tail nodes to avoid null-check branching.
- **Per-Item TTL**: Entries can specify an individual TTL or inherit the cache default.
- **Background Purge**: Optional interval-based automated sweeping of expired entries.
- **Disposal Callbacks**: Comprehensive event notifications on item eviction, expiration, replacement, deletion, or cache clearing.
- **Deterministic Resource Teardown**: Implements clean `destroy()` method clearing intervals and unlinking node pointers.
- **Full Type Safety**: Strict generic typing (`K`, `V`), with zero `any` or loose casts.

## Files

- `lru-cache.ts`: Full production implementation.
- `lru-cache.test.ts`: Complete unit test suite verifying eviction ordering, TTL expiry, concurrency simulation, and disposal callbacks.
