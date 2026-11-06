import express from 'express';
import { metricsCollector as defaultCollector } from './metricsCollector.js';

/**
 * Creates an Express router exposing the Mini CDN metrics endpoints.
 * 
 * Endpoints:
 * - GET /overview  (or /api/metrics/overview)
 * - GET /edges     (or /api/metrics/edges)
 * - GET /requests  (or /api/metrics/requests)
 * - GET /bandwidth (or /api/metrics/bandwidth)
 * - GET /cache     (or /api/metrics/cache)
 */
export function createMetricsRouter(collector = defaultCollector) {
  const router = express.Router();

  // GET /api/metrics/overview
  router.get('/overview', (req, res) => {
    const overview = collector.getOverview();
    res.status(200).json(overview);
  });

  // GET /api/metrics/edges
  router.get('/edges', (req, res) => {
    const edges = collector.getEdges();
    // If client explicitly requested an object wrapper
    if (req.query.wrapper === 'true' || req.query.format === 'object') {
      return res.status(200).json({
        total: edges.length,
        edges
      });
    }
    res.status(200).json(edges);
  });

  // GET /api/metrics/requests
  router.get('/requests', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const requests = collector.getRequests(limit);

    // If client explicitly requested an object wrapper
    if (req.query.wrapper === 'true' || req.query.format === 'object') {
      return res.status(200).json({
        total: requests.length,
        requests
      });
    }
    res.status(200).json(requests);
  });

  // GET /api/metrics/bandwidth
  router.get('/bandwidth', (req, res) => {
    const bandwidth = collector.getBandwidth();
    res.status(200).json(bandwidth);
  });

  // GET /api/metrics/cache
  router.get('/cache', (req, res) => {
    const cache = collector.getCache();
    res.status(200).json(cache);
  });

  return router;
}

// Default router instance
export default createMetricsRouter();

