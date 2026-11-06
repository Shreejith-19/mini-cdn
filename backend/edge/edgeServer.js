import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { InMemoryEdgeCache } from './cache.js';
import { resolveEdgeConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createEdgeApp(customConfig = {}) {
  const resolved = resolveEdgeConfig();
  const config = { ...resolved, ...customConfig };

  const app = express();
  const cache = new InMemoryEdgeCache({
    maxCapacity: config.cacheMaxCapacity,
    defaultTtlSec: config.cacheDefaultTtlSec
  });

  const startTime = Date.now();
  const metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    bytesServed: 0,
    recentRequests: []
  };

  // Configure EJS view engine
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, '../views'));

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getHitRatio() {
    if (metrics.totalRequests === 0) return 0;
    return parseFloat(((metrics.cacheHits / metrics.totalRequests) * 100).toFixed(1));
  }

  function recordRecentRequest(item) {
    metrics.recentRequests.unshift(item);
    if (metrics.recentRequests.length > 30) {
      metrics.recentRequests.pop();
    }
  }

  /**
   * GET /health
   * Returns: server health, edge name, uptime
   */
  app.get(['/health', '/edge/health'], (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    res.status(200).json({
      status: 'healthy',
      edgeName: config.name,
      uptime: uptimeSeconds,
      location: config.location,
      port: config.port
    });
  });

  /**
   * GET /stats
   * Returns: total requests, cache hits, cache misses, cache hit ratio, cached object count, bytes served
   */
  app.get(['/stats', '/edge/stats'], (req, res) => {
    const cachedCount = cache.size();
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    res.status(200).json({
      edgeName: config.name,
      location: config.location,
      port: config.port,
      totalRequests: metrics.totalRequests,
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
      cacheHitRatio: `${getHitRatio()}%`,
      cacheHitRatioNumeric: getHitRatio(),
      cachedObjectCount: cachedCount,
      bytesServed: metrics.bytesServed,
      bytesServedFormatted: formatBytes(metrics.bytesServed),
      uptime: uptimeSeconds
    });
  });

  /**
   * GET /cache
   * Returns: cached object metadata
   */
  app.get(['/cache', '/edge/cache'], (req, res) => {
    const metadataList = cache.getMetadataList();
    res.status(200).json({
      edgeName: config.name,
      count: metadataList.length,
      objects: metadataList
    });
  });

  /**
   * DELETE /cache
   * Clears the edge cache
   */
  app.delete(['/cache', '/edge/cache'], (req, res) => {
    const clearedCount = cache.clear();
    res.status(200).json({
      message: 'Edge cache cleared successfully',
      edgeName: config.name,
      clearedCount
    });
  });

  /**
   * Optional single item delete: DELETE /cache/:filename
   */
  app.delete(['/cache/:filename', '/edge/cache/:filename'], (req, res) => {
    const safeFilename = path.basename(req.params.filename);
    const key = `/origin/content/${safeFilename}`;
    const success = cache.delete(key);
    res.status(200).json({
      message: success ? `Purged ${safeFilename}` : `File not found in cache: ${safeFilename}`,
      success,
      edgeName: config.name
    });
  });

  /**
   * Content delivery logic
   * GET /content/:filename (and /edge/content/:filename)
   * 1. Check local cache
   * 2. If hit & valid: return it immediately (does NOT contact origin)
   * 3. If miss/expired: fetch from origin, store eligible response in local cache, return content
   * 4. Handle origin failures gracefully
   */
  const handleContent = async (req, res) => {
    const start = Date.now();
    metrics.totalRequests++;

    const safeFilename = path.basename(req.params.filename);
    const cacheKey = `/origin/content/${safeFilename}`;

    // 1. Check local in-memory cache
    const cachedEntry = cache.get(cacheKey);

    if (cachedEntry) {
      // CACHE HIT - serve from memory without contacting origin!
      metrics.cacheHits++;
      metrics.bytesServed += cachedEntry.size;

      // Handle conditional If-None-Match
      if (req.headers['if-none-match'] && req.headers['if-none-match'] === cachedEntry.headers['etag']) {
        return res.status(304).end();
      }

      const duration = Date.now() - start;

      res.setHeader('Content-Type', cachedEntry.contentType);
      res.setHeader('Content-Length', cachedEntry.size);
      if (cachedEntry.headers['etag']) res.setHeader('ETag', cachedEntry.headers['etag']);
      if (cachedEntry.headers['cache-control']) res.setHeader('Cache-Control', cachedEntry.headers['cache-control']);
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Edge', config.name);
      res.setHeader('X-Edge-Latency', `${duration}ms`);
      res.setHeader('Access-Control-Allow-Origin', '*');

      recordRecentRequest({
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        cacheStatus: 'HIT',
        latencyMs: duration,
        statusCode: 200,
        bytes: cachedEntry.size,
        bytesFormatted: formatBytes(cachedEntry.size)
      });

      return res.status(200).send(cachedEntry.buffer);
    }

    // CACHE MISS - Fetch from Origin server
    metrics.cacheMisses++;

    try {
      const originUrl = `${config.originUrl}/origin/content/${encodeURIComponent(safeFilename)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const originRes = await fetch(originUrl, {
        signal: controller.signal,
        headers: {
          'X-Forwarded-From-Edge': config.name
        }
      });
      clearTimeout(timeoutId);

      // Handle 404 or other origin non-200 responses
      if (!originRes.ok) {
        const errorText = await originRes.text();
        const duration = Date.now() - start;

        recordRecentRequest({
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
          cacheStatus: 'MISS',
          latencyMs: duration,
          statusCode: originRes.status,
          bytes: 0,
          bytesFormatted: '0 B'
        });

        return res.status(originRes.status).send(errorText);
      }

      // Origin returned 200 OK: extract payload and headers
      const contentType = originRes.headers.get('content-type') || 'application/octet-stream';
      const etag = originRes.headers.get('etag');
      const cacheControl = originRes.headers.get('cache-control') || 'public, max-age=60';
      const arrayBuffer = await originRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      metrics.bytesServed += buffer.length;

      // Extract TTL from max-age if present, else default TTL
      let ttlSec = config.cacheDefaultTtlSec;
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        ttlSec = parseInt(maxAgeMatch[1], 10);
      }

      // Store in local in-memory cache
      cache.set(cacheKey, {
        buffer,
        contentType,
        headers: {
          etag,
          'cache-control': cacheControl
        },
        ttlSec
      });

      const duration = Date.now() - start;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', buffer.length);
      if (etag) res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', cacheControl);
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Edge', config.name);
      res.setHeader('X-Edge-Latency', `${duration}ms`);
      res.setHeader('Access-Control-Allow-Origin', '*');

      recordRecentRequest({
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        cacheStatus: 'MISS',
        latencyMs: duration,
        statusCode: 200,
        bytes: buffer.length,
        bytesFormatted: formatBytes(buffer.length)
      });

      return res.status(200).send(buffer);

    } catch (err) {
      // Gracefully handle origin server offline / timeout failures
      console.error(`[${config.name} Error] Connecting to Origin (${config.originUrl}):`, err.message);
      const duration = Date.now() - start;

      recordRecentRequest({
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        cacheStatus: 'ERROR',
        latencyMs: duration,
        statusCode: 502,
        bytes: 0,
        bytesFormatted: '0 B'
      });

      return res.status(502).json({
        error: 'Bad Gateway: Origin server is unreachable or timed out',
        edgeName: config.name,
        originUrl: config.originUrl,
        details: err.message
      });
    }
  };

  app.get('/content/:filename', handleContent);
  app.get('/edge/content/:filename', handleContent);

  /**
   * EJS Diagnostic Page
   * Displays:
   * - Edge location
   * - Server status
   * - Cache object count
   * - Cache hits
   * - Cache misses
   * - Cache hit ratio
   */
  app.get(['/', '/edge', '/diagnostics'], (req, res) => {
    const cachedObjects = cache.getMetadataList();
    const hitRatio = getHitRatio();

    res.render('edge', {
      edgeLocation: config.location,
      serverStatus: 'ONLINE',
      edgeName: config.name,
      port: config.port,
      originUrl: config.originUrl,
      cacheObjectCount: cachedObjects.length,
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
      cacheHitRatio: `${hitRatio}%`,
      cacheHitRatioNumeric: hitRatio,
      totalRequests: metrics.totalRequests,
      bytesServedFormatted: formatBytes(metrics.bytesServed),
      cachedObjects,
      recentRequests: metrics.recentRequests.slice(0, 15)
    });
  });

  return { app, config, cache, metrics };
}

// If executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { app, config } = createEdgeApp();
  app.listen(config.port, () => {
    console.log(`[Mini CDN Edge] ${config.name} running on http://localhost:${config.port}`);
    console.log(`[Mini CDN Edge] Location: ${config.location}`);
    console.log(`[Mini CDN Edge] Diagnostics: http://localhost:${config.port}/`);
    console.log(`[Mini CDN Edge] Origin: ${config.originUrl}`);
  });
}
