import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const STORAGE_DIR = path.resolve(__dirname, 'storage');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Supported file extensions and MIME types
const SUPPORTED_EXTENSIONS = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

// In-memory runtime telemetry for the origin server
export const originStats = {
  startTime: Date.now(),
  totalRequests: 0,
  bytesServed: 0,
  failedRequests: 0
};

// Helper: Format bytes to human readable string
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper: Format uptime
export function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Helper: Compute strong ETag
export function computeETag(buffer) {
  return `"${crypto.createHash('md5').update(buffer).digest('hex')}"`;
}

// Helper: Get list of files in storage
export function getStorageFiles() {
  if (!fs.existsSync(STORAGE_DIR)) return [];
  const files = fs.readdirSync(STORAGE_DIR);
  return files
    .filter(file => !file.startsWith('.'))
    .map(file => {
      const filePath = path.join(STORAGE_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        const ext = path.extname(file).toLowerCase();
        const mimeType = SUPPORTED_EXTENSIONS[ext] || 'application/octet-stream';
        return {
          filename: file,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          mimeType,
          lastModified: stats.mtime.toUTCString(),
          url: `/origin/content/${encodeURIComponent(file)}`
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Global origin telemetry middleware
router.use((req, res, next) => {
  originStats.totalRequests++;

  // Capture failed status codes
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      originStats.failedRequests++;
    }
  });

  next();
});

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to avoid path injection
    const cleanName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, cleanName);
  }
});

// Multer file filter to enforce supported types
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (SUPPORTED_EXTENSIONS[ext]) {
    cb(null, true);
  } else {
    const error = new Error(`Unsupported file type: ${ext}. Supported types: JPG, PNG, WebP, PDF, MP4, TXT, JSON.`);
    error.status = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

/**
 * GET /origin
 * EJS diagnostic page
 * Displays: Origin server status, number of files, total requests, total bandwidth served
 */
router.get('/', (req, res) => {
  const files = getStorageFiles();
  const uptimeSeconds = Math.floor((Date.now() - originStats.startTime) / 1000);

  res.render('origin', {
    status: 'ONLINE',
    port: 8000,
    filesCount: files.length,
    files,
    totalRequests: originStats.totalRequests,
    bytesServed: originStats.bytesServed,
    bytesServedFormatted: formatBytes(originStats.bytesServed),
    failedRequests: originStats.failedRequests,
    uptimeFormatted: formatUptime(uptimeSeconds),
    startTime: new Date(originStats.startTime).toLocaleString()
  });
});

/**
 * POST /origin/upload
 * Upload a file, save to storage, return metadata
 */
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(err.status || 400).json({
        error: err.message || 'File upload failed'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided in form-data field "file"'
      });
    }

    const ext = path.extname(req.file.filename).toLowerCase();
    const mimeType = SUPPORTED_EXTENSIONS[ext] || req.file.mimetype;
    const fileBuffer = fs.readFileSync(req.file.path);
    const etag = computeETag(fileBuffer);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        sizeFormatted: formatBytes(req.file.size),
        mimeType,
        etag,
        uploadedAt: new Date().toISOString(),
        url: `/origin/content/${encodeURIComponent(req.file.filename)}`
      }
    });
  });
});

/**
 * GET /origin/content/:filename
 * Retrieve requested file with HTTP headers (Cache-Control, ETag, etc.)
 */
router.get('/content/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(STORAGE_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'File not found on origin server',
      filename: safeFilename
    });
  }

  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const mimeType = SUPPORTED_EXTENSIONS[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    const etag = computeETag(content);

    // Set standard CDN caching headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    res.setHeader('X-Origin-Server', 'Origin-8000');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Conditional ETag check: 304 Not Modified
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    // Update bytes served
    originStats.bytesServed += stats.size;

    return res.status(200).send(content);
  } catch (error) {
    console.error(`[Origin Error] Serving ${safeFilename}:`, error);
    return res.status(500).json({
      error: 'Failed to read file from origin storage'
    });
  }
});

/**
 * GET /origin/files
 * Return list of available files with metadata
 */
router.get('/files', (req, res) => {
  const files = getStorageFiles();
  res.status(200).json({
    count: files.length,
    files
  });
});

/**
 * DELETE /origin/content/:filename
 * Delete a file from storage
 */
router.delete('/content/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(STORAGE_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'File not found on origin server',
      filename: safeFilename
    });
  }

  try {
    fs.unlinkSync(filePath);
    res.status(200).json({
      message: 'File deleted successfully',
      filename: safeFilename
    });
  } catch (error) {
    console.error(`[Origin Error] Deleting ${safeFilename}:`, error);
    res.status(500).json({
      error: 'Failed to delete file from origin storage'
    });
  }
});

/**
 * GET /origin/stats
 * Return total requests, bytes served, failed requests
 */
router.get('/stats', (req, res) => {
  const files = getStorageFiles();
  const uptimeSeconds = Math.floor((Date.now() - originStats.startTime) / 1000);

  res.status(200).json({
    status: 'online',
    port: 8000,
    totalRequests: originStats.totalRequests,
    bytesServed: originStats.bytesServed,
    bytesServedFormatted: formatBytes(originStats.bytesServed),
    failedRequests: originStats.failedRequests,
    filesCount: files.length,
    uptimeSeconds
  });
});

export default router;

