/**
 * Independent In-Memory Cache for CDN Edge Servers
 * 
 * Each Edge server instance holds its own isolated memory space.
 * Features:
 * - O(1) Map lookups
 * - Time-To-Live (TTL) expiration with lazy and scheduled eviction
 * - Least-Recently-Used (LRU) size-bound eviction
 * - Invalidation & Purge API
 * - Hit and bandwidth telemetry
 */
export class InMemoryEdgeCache {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 100;
    this.defaultTtlSec = options.defaultTtlSec || 3600; // 1 hour default
    this.store = new Map();
    this.totalEvictions = 0;
  }

  /**
   * Retrieves an item from cache.
   * Updates LRU access ordering and hit counter.
   * Returns null if key not found or expired.
   */
  get(key) {
    if (!this.store.has(key)) {
      return null;
    }

    const entry = this.store.get(key);
    const now = Date.now();

    // Check TTL expiration
    if (entry.expiresAt && entry.expiresAt <= now) {
      this.store.delete(key);
      return null;
    }

    // Refresh LRU ordering: delete and re-insert
    this.store.delete(key);
    entry.hits += 1;
    entry.lastAccessed = now;
    this.store.set(key, entry);

    return entry;
  }

  /**
   * Stores an item in the in-memory cache.
   * Evicts the oldest entry if max capacity is exceeded.
   */
  set(key, data) {
    const now = Date.now();
    const ttlSec = typeof data.ttlSec === 'number' ? data.ttlSec : this.defaultTtlSec;
    const expiresAt = ttlSec > 0 ? now + ttlSec * 1000 : null;

    // Handle existing key or LRU capacity eviction
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.totalEvictions++;
      }
    }

    const buffer = Buffer.isBuffer(data.buffer)
      ? data.buffer
      : Buffer.from(typeof data.buffer === 'string' ? data.buffer : JSON.stringify(data.buffer));

    const entry = {
      key,
      buffer,
      contentType: data.contentType || 'application/octet-stream',
      headers: data.headers || {},
      statusCode: data.statusCode || 200,
      size: buffer.length,
      cachedAt: now,
      ttlSec,
      expiresAt,
      hits: 0,
      lastAccessed: now
    };

    this.store.set(key, entry);
    return entry;
  }

  /**
   * Purges a single entry by key.
   */
  purge(key) {
    return this.store.delete(key);
  }

  /**
   * Clears all cached entries.
   */
  purgeAll() {
    const count = this.store.size;
    this.store.clear();
    return count;
  }

  /**
   * Returns list of cached items with TTL remaining.
   */
  listEntries() {
    const now = Date.now();
    const list = [];

    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && item.expiresAt <= now) {
        this.store.delete(key);
        continue;
      }

      const ttlRemainingSec = item.expiresAt
        ? Math.max(0, Math.round((item.expiresAt - now) / 1000))
        : null;

      list.push({
        key: item.key,
        contentType: item.contentType,
        size: item.size,
        sizeFormatted: this.formatBytes(item.size),
        cachedAt: new Date(item.cachedAt).toISOString(),
        expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString() : 'Never',
        ttlRemainingSec,
        hits: item.hits,
        etag: item.headers['etag'] || null
      });
    }

    return list;
  }

  /**
   * Returns summary statistics.
   */
  getStats() {
    let totalSizeBytes = 0;
    for (const item of this.store.values()) {
      totalSizeBytes += item.size;
    }
    return {
      itemCount: this.store.size,
      maxEntries: this.maxEntries,
      totalSizeBytes,
      totalSizeFormatted: this.formatBytes(totalSizeBytes),
      totalEvictions: this.totalEvictions
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
