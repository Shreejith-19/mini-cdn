/**
 * Custom In-Memory LRU Cache using JavaScript Map
 * 
 * Features:
 * - JavaScript Map for O(1) lookup and natural LRU key ordering
 * - Maximum capacity limit (default 100 objects)
 * - Time-To-Live (TTL) expiration (default 60 seconds)
 * - Cache hit / miss tracking
 * - LRU eviction when capacity is reached
 * - No external dependencies or Redis
 */
export class InMemoryEdgeCache {
  constructor(options = {}) {
    this.maxCapacity = options.maxCapacity || 100;
    this.defaultTtlSec = options.defaultTtlSec || 60; // 60 seconds default
    this.store = new Map();
    this.evictionCount = 0;
  }

  /**
   * Cache lookup
   * If found and valid: updates LRU order and hit count, returns entry.
   * If expired: deletes entry and returns null.
   * If not found: returns null.
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

    // Refresh LRU order: delete and re-insert
    this.store.delete(key);
    entry.hits += 1;
    entry.lastAccessed = now;
    this.store.set(key, entry);

    return entry;
  }

  /**
   * Cache insertion
   * Stores data buffer, headers, mime type.
   * Evicts least recently used (LRU) entry if capacity is reached.
   */
  set(key, data) {
    const now = Date.now();
    const ttlSec = typeof data.ttlSec === 'number' ? data.ttlSec : this.defaultTtlSec;
    const expiresAt = ttlSec > 0 ? now + (ttlSec * 1000) : null;

    // If key exists, delete first so it updates insertion order
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxCapacity) {
      // LRU eviction: the first key in Map iterator is the oldest / least recently used
      const lruKey = this.store.keys().next().value;
      if (lruKey !== undefined) {
        this.store.delete(lruKey);
        this.evictionCount++;
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
   * Clear the entire cache
   */
  clear() {
    const count = this.store.size;
    this.store.clear();
    return count;
  }

  /**
   * Purge a single key
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Return number of valid items in cache
   */
  size() {
    this.cleanupExpired();
    return this.store.size;
  }

  /**
   * Lazily clean up expired items
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Return list of cached object metadata
   */
  getMetadataList() {
    this.cleanupExpired();
    const now = Date.now();
    const list = [];

    for (const [key, entry] of this.store.entries()) {
      const ttlRemaining = entry.expiresAt
        ? Math.max(0, Math.round((entry.expiresAt - now) / 1000))
        : null;

      list.push({
        key,
        contentType: entry.contentType,
        size: entry.size,
        sizeFormatted: this.formatBytes(entry.size),
        cachedAt: new Date(entry.cachedAt).toISOString(),
        expiresAt: entry.expiresAt ? new Date(entry.expiresAt).toISOString() : null,
        ttlRemainingSeconds: ttlRemaining,
        hits: entry.hits,
        etag: entry.headers['etag'] || null
      });
    }

    return list;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
