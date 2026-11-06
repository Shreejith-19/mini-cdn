import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.ORIGIN_PORT || process.env.PORT || '8000', 10);
let simulatedLatencyMs = parseInt(process.env.SIMULATED_LATENCY_MS || '150', 10);
const DEFAULT_CACHE_CONTROL = process.env.CACHE_CONTROL_DEFAULT || 'public, max-age=60';

const ASSETS_DIR = path.resolve(__dirname, '../public/assets');

// Setup EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../views'));

app.use(cors());
app.use(express.json());

// In-memory runtime metrics
const metrics = {
  startTime: Date.now(),
  totalRequests: 0,
  assetRequests: 0,
  bytesTransferred: 0,
  recentRequests: []
};

// MIME types lookup table
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Global request tracker middleware
app.use((req, res, next) => {
  const start = Date.now();
  metrics.totalRequests++;

  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;
    let bytes = 0;
    if (data) {
      bytes = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
    }
    metrics.bytesTransferred += bytes;

    // Track last 30 requests (skip internal status polls to avoid flooding log)
    if (!req.path.startsWith('/api/status') && !req.path.startsWith('/health')) {
      metrics.recentRequests.unshift({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
        statusCode: res.statusCode,
        latencyMs: duration,
        bytes,
        bytesFormatted: formatBytes(bytes)
      });
      if (metrics.recentRequests.length > 30) {
        metrics.recentRequests.pop();
      }
    }

    return originalSend.apply(this, arguments);
  };

  next();
});

// Helper to list available assets with metadata
function getAssetsList() {
  if (!fs.existsSync(ASSETS_DIR)) {
    return [];
  }
  const files = fs.readdirSync(ASSETS_DIR);
  return files.map((file) => {
    const filePath = path.join(ASSETS_DIR, file);
    const stats = fs.statSync(filePath);
    const ext = path.extname(file).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    return {
      filename: file,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      mimeType,
      cacheControl: DEFAULT_CACHE_CONTROL,
      url: `/assets/${file}`,
      lastModified: stats.mtime.toUTCString()
    };
  });
}

// Diagnostic UI view
app.get('/', (req, res) => {
  res.redirect('/diagnostics');
});

app.get('/diagnostics', (req, res) => {
  const uptimeSeconds = (Date.now() - metrics.startTime) / 1000;
  const assets = getAssetsList();

  res.render('diagnostics', {
    port: PORT,
    metrics,
    formattedBytes: formatBytes(metrics.bytesTransferred),
    simulatedLatency: simulatedLatencyMs,
    uptimeFormatted: formatUptime(uptimeSeconds),
    startTime: metrics.startTime,
    assets,
    recentRequests: metrics.recentRequests.slice(0, 15)
  });
});

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'healthy',
    role: 'origin',
    port: PORT,
    simulatedLatencyMs,
    uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
    timestamp: new Date().toISOString()
  });
});

// Real-time metrics API endpoint
app.get('/api/status', (req, res) => {
  const uptimeSeconds = (Date.now() - metrics.startTime) / 1000;
  res.json({
    status: 'online',
    role: 'origin',
    port: PORT,
    simulatedLatencyMs,
    uptimeSeconds: Math.floor(uptimeSeconds),
    uptimeFormatted: formatUptime(uptimeSeconds),
    totalRequests: metrics.totalRequests,
    assetRequests: metrics.assetRequests,
    bytesTransferred: metrics.bytesTransferred,
    bytesTransferredFormatted: formatBytes(metrics.bytesTransferred),
    recentRequestsCount: metrics.recentRequests.length,
    recentRequests: metrics.recentRequests.slice(0, 10)
  });
});

// Asset catalog API endpoint
app.get('/api/assets', (req, res) => {
  res.json({
    total: getAssetsList().length,
    assets: getAssetsList()
  });
});

// Update latency simulator config
app.post('/api/config', (req, res) => {
  const { simulatedLatencyMs: newLatency } = req.body;
  if (typeof newLatency === 'number' && newLatency >= 0 && newLatency <= 5000) {
    simulatedLatencyMs = newLatency;
    return res.json({ success: true, simulatedLatencyMs });
  }
  return res.status(400).json({ error: 'simulatedLatencyMs must be a number between 0 and 5000' });
});

// Reset metrics counters
app.post('/api/reset-metrics', (req, res) => {
  metrics.totalRequests = 0;
  metrics.assetRequests = 0;
  metrics.bytesTransferred = 0;
  metrics.recentRequests = [];
  metrics.startTime = Date.now();
  res.json({ success: true, message: 'Origin metrics reset' });
});

// Asset delivery handler with simulated geographical/database latency
function handleAssetDelivery(req, res) {
  const filename = req.params.filename;
  // Security check: prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(ASSETS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'Asset not found on Origin server',
      filename: safeFilename
    });
  }

  metrics.assetRequests++;

  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);

    // Compute strong ETag from file content
    const etag = `"${crypto.createHash('md5').update(content).digest('hex')}"`;

    // Allow override via query param for testing cache invalidation (e.g. ?cacheControl=no-store)
    const cacheControl = req.query.cacheControl || DEFAULT_CACHE_CONTROL;

    // Check If-None-Match for 304 Not Modified
    if (req.headers['if-none-match'] === etag) {
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', cacheControl);
      res.setHeader('X-Origin-Server', `Central-Origin-${PORT}`);
      return res.status(304).end();
    }

    // Apply simulated latency before answering
    const delay = simulatedLatencyMs;
    setTimeout(() => {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('ETag', etag);
      res.setHeader('Last-Modified', stats.mtime.toUTCString());
      res.setHeader('Cache-Control', cacheControl);
      res.setHeader('X-Origin-Server', `Central-Origin-${PORT}`);
      res.setHeader('X-Origin-Latency', `${delay}ms`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).send(content);
    }, delay);

  } catch (err) {
    console.error(`[Origin Error] Serving ${safeFilename}:`, err);
    res.status(500).json({ error: 'Failed to read asset from origin storage' });
  }
}

// Content routes
app.get('/assets/:filename', handleAssetDelivery);
app.get('/content/:filename', handleAssetDelivery);

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Mini CDN Origin] Central Authoritative Server running on http://localhost:${PORT}`);
  console.log(`[Mini CDN Origin] Simulated latency: ${simulatedLatencyMs}ms`);
  console.log(`[Mini CDN Origin] Diagnostics UI: http://localhost:${PORT}/diagnostics`);
});

export { app, server };

