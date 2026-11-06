import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import originRouter from './origin/originRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;
const startTime = Date.now();

// View engine configuration (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Core middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Mount Origin server router at /origin
app.use('/origin', originRouter);

// Global Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    service: 'mini-cdn-backend',
    port: PORT
  });
});

// Root route redirects to Origin diagnostic page
app.get('/', (req, res) => {
  res.redirect('/origin');
});

// Start listening if run directly
const server = app.listen(PORT, () => {
  console.log(`[Mini CDN Origin] Server running on http://localhost:${PORT}`);
  console.log(`[Mini CDN Origin] Diagnostics: http://localhost:${PORT}/origin`);
  console.log(`[Mini CDN Origin] Health: http://localhost:${PORT}/health`);
});

export { app, server };
