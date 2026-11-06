import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;
const startTime = Date.now();

// View engine configuration (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Root route rendering EJS view
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Mini CDN Backend Service',
    message: 'Backend server initialized with Express and EJS view engine.',
    port: PORT
  });
});

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    service: 'mini-cdn-backend',
    port: PORT
  });
});

// Start listening if run directly
const server = app.listen(PORT, () => {
  console.log(`[Mini CDN Backend] Server running on http://localhost:${PORT}`);
  console.log(`[Mini CDN Backend] Health endpoint: http://localhost:${PORT}/health`);
});

export { app, server };

