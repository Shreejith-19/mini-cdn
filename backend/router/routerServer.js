import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createRouterApp(customConfig = {}) {
  const app = express();
  const PORT = parseInt(process.env.ROUTER_PORT || process.env.PORT || customConfig.port || '9000', 10);

  // Supported routing strategies
  const STRATEGIES = {
    ROUND_ROBIN: 'ROUND_ROBIN',
    LOWEST_LATENCY: 'LOWEST_LATENCY'
  };

  let currentStrategy = STRATEGIES.ROUND_ROBIN;
  let roundRobinIndex = 0;
  const startTime = Date.now();

  // Edge server definitions with required initial simulated latency values:
  // Mumbai: 35 ms, Singapore: 80 ms, Frankfurt: 150 ms, New York: 180 ms
  const edges = [
    {
      id: 'mumbai',
      name: 'Mumbai Edge',
      location: 'Mumbai, India',
      port: 8001,
      url: process.env.EDGE_MUMBAI_URL || 'http://localhost:8001',
      simulatedLatencyMs: 35,
      status: 'HEALTHY',
      lastChecked: null,
      consecutiveFailures: 0,
      requestsRouted: 0
    },
    {
      id: 'singapore',
      name: 'Singapore Edge',
      location: 'Singapore',
      port: 8002,
      url: process.env.EDGE_SINGAPORE_URL || 'http://localhost:8002',
      simulatedLatencyMs: 80,
      status: 'HEALTHY',
      lastChecked: null,
      consecutiveFailures: 0,
      requestsRouted: 0
    },
    {
      id: 'frankfurt',
      name: 'Frankfurt Edge',
      location: 'Frankfurt, Germany',
      port: 8003,
      url: process.env.EDGE_FRANKFURT_URL || 'http://localhost:8003',
      simulatedLatencyMs: 150,
      status: 'HEALTHY',
      lastChecked: null,
      consecutiveFailures: 0,
      requestsRouted: 0
    },
    {
      id: 'newyork',
      name: 'New York Edge',
      location: 'New York, USA',
      port: 8004,
      url: process.env.EDGE_NEWYORK_URL || 'http://localhost:8004',
      simulatedLatencyMs: 180,
      status: 'HEALTHY',
      lastChecked: null,
      consecutiveFailures: 0,
      requestsRouted: 0
    }
  ];

  // Routing decision log
  const routingDecisions = [];

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Configure EJS view engine
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, '../views'));

  function recordDecision(decision) {
    routingDecisions.unshift({
      id: `route-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...decision
    });
    if (routingDecisions.length > 50) {
      routingDecisions.pop();
    }
  }

  /**
   * Health probe helper to check edge server status
   */
  async function probeEdge(edge) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await fetch(`${edge.url}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        edge.status = 'HEALTHY';
        edge.consecutiveFailures = 0;
      } else {
        edge.consecutiveFailures++;
        if (edge.consecutiveFailures >= 2) edge.status = 'UNHEALTHY';
      }
    } catch {
      edge.consecutiveFailures++;
      if (edge.consecutiveFailures >= 2) edge.status = 'UNHEALTHY';
    } finally {
      edge.lastChecked = new Date().toISOString();
    }
  }

  async function checkAllEdges() {
    await Promise.all(edges.map(probeEdge));
  }

  // Periodic health check every 5 seconds
  const probeTimer = setInterval(checkAllEdges, 5000);

  /**
   * Selects an edge server based on the active routing strategy
   * Never routes new requests to unhealthy edges.
   */
  function selectEdge() {
    const healthyEdges = edges.filter(e => e.status === 'HEALTHY');

    if (healthyEdges.length === 0) {
      return null;
    }

    if (currentStrategy === STRATEGIES.LOWEST_LATENCY) {
      // Pick healthy edge with lowest configured simulatedLatencyMs
      let lowest = healthyEdges[0];
      for (const edge of healthyEdges) {
        if (edge.simulatedLatencyMs < lowest.simulatedLatencyMs) {
          lowest = edge;
        }
      }
      return lowest;
    }

    // Default: ROUND_ROBIN sequentially across healthy edges
    const selected = healthyEdges[roundRobinIndex % healthyEdges.length];
    roundRobinIndex = (roundRobinIndex + 1) % healthyEdges.length;
    return selected;
  }

  /**
   * GET /cdn/config
   * Return the current routing strategy
   */
  app.get('/cdn/config', (req, res) => {
    res.status(200).json({
      strategy: currentStrategy,
      availableStrategies: [STRATEGIES.ROUND_ROBIN, STRATEGIES.LOWEST_LATENCY]
    });
  });

  /**
   * PUT /cdn/config
   * Change the routing strategy (ROUND_ROBIN or LOWEST_LATENCY)
   */
  app.put('/cdn/config', (req, res) => {
    const { strategy } = req.body || {};
    if (!strategy) {
      return res.status(400).json({
        error: 'Missing strategy in request body. Acceptable values: ROUND_ROBIN, LOWEST_LATENCY'
      });
    }

    const normalized = strategy.trim().toUpperCase();
    if (normalized === STRATEGIES.ROUND_ROBIN || normalized === STRATEGIES.LOWEST_LATENCY) {
      currentStrategy = normalized;
      return res.status(200).json({
        message: 'Routing strategy updated successfully',
        strategy: currentStrategy
      });
    }

    return res.status(400).json({
      error: `Invalid strategy: "${strategy}". Acceptable values: ROUND_ROBIN, LOWEST_LATENCY`
    });
  });

  /**
   * GET /cdn/edges
   * Return all four edge servers with their status and configured latency
   */
  app.get('/cdn/edges', (req, res) => {
    res.status(200).json(
      edges.map(e => ({
        id: e.id,
        name: e.name,
        location: e.location,
        port: e.port,
        url: e.url,
        simulatedLatencyMs: e.simulatedLatencyMs,
        status: e.status,
        requestsRouted: e.requestsRouted || 0,
        lastChecked: e.lastChecked
      }))
    );
  });

  /**
   * GET /cdn/content/:filename
   * 1. Select edge server using active strategy
   * 2. Forward request
   * 3. Return edge response
   * 4. Include selected edge name in response metadata (headers)
   * 5. Record every routing decision
   * 6. Clearly distinguish simulated routing latency from actual HTTP duration
   */
  const handleCdnContent = async (req, res) => {
    const requestStart = Date.now();
    const safeFilename = path.basename(req.params.filename);

    const selectedEdge = selectEdge();

    // Meaningful error if all edges are unavailable
    if (!selectedEdge) {
      recordDecision({
        file: safeFilename,
        strategy: currentStrategy,
        selectedEdge: 'NONE',
        edgePort: null,
        simulatedLatencyMs: 0,
        actualDurationMs: Date.now() - requestStart,
        status: 503,
        error: 'All edge servers are currently unavailable'
      });

      return res.status(503).json({
        error: 'Service Unavailable: All edge servers are currently unavailable',
        routerPort: PORT,
        strategy: currentStrategy
      });
    }

    selectedEdge.requestsRouted++;

    try {
      const edgeUrl = `${selectedEdge.url}/content/${encodeURIComponent(safeFilename)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // Edge timeout

      const edgeRes = await fetch(edgeUrl, {
        signal: controller.signal,
        headers: {
          'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
          'If-None-Match': req.headers['if-none-match'] || ''
        }
      });
      clearTimeout(timeoutId);

      const actualDurationMs = Date.now() - requestStart;
      const cacheStatus = edgeRes.headers.get('x-cache') || 'UNKNOWN';

      // Record routing decision
      recordDecision({
        file: safeFilename,
        strategy: currentStrategy,
        selectedEdge: selectedEdge.name,
        edgePort: selectedEdge.port,
        simulatedLatencyMs: selectedEdge.simulatedLatencyMs,
        actualDurationMs,
        cacheStatus,
        status: edgeRes.status
      });

      // Pass-through conditional 304 Not Modified
      if (edgeRes.status === 304) {
        res.setHeader('X-Selected-Edge', selectedEdge.name);
        res.setHeader('X-Edge-Simulated-Latency', `${selectedEdge.simulatedLatencyMs}ms`);
        res.setHeader('X-Actual-Request-Duration', `${actualDurationMs}ms`);
        res.setHeader('X-Routing-Strategy', currentStrategy);
        return res.status(304).end();
      }

      // Check if edge returned 404 or other non-OK status
      if (!edgeRes.ok) {
        const errorText = await edgeRes.text();
        res.setHeader('X-Selected-Edge', selectedEdge.name);
        res.setHeader('X-Edge-Simulated-Latency', `${selectedEdge.simulatedLatencyMs}ms`);
        res.setHeader('X-Actual-Request-Duration', `${actualDurationMs}ms`);
        res.setHeader('X-Routing-Strategy', currentStrategy);
        return res.status(edgeRes.status).send(errorText);
      }

      const arrayBuffer = await edgeRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Metadata headers clearly distinguishing simulated routing latency from actual duration
      res.setHeader('X-Selected-Edge', selectedEdge.name);
      res.setHeader('X-Edge-Simulated-Latency', `${selectedEdge.simulatedLatencyMs}ms`);
      res.setHeader('X-Actual-Request-Duration', `${actualDurationMs}ms`);
      res.setHeader('X-Routing-Strategy', currentStrategy);
      res.setHeader('X-Edge-Port', selectedEdge.port);

      // Forward caching & content headers
      if (edgeRes.headers.get('x-cache')) res.setHeader('X-Cache', edgeRes.headers.get('x-cache'));
      if (edgeRes.headers.get('content-type')) res.setHeader('Content-Type', edgeRes.headers.get('content-type'));
      if (edgeRes.headers.get('etag')) res.setHeader('ETag', edgeRes.headers.get('etag'));
      if (edgeRes.headers.get('cache-control')) res.setHeader('Cache-Control', edgeRes.headers.get('cache-control'));
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Access-Control-Allow-Origin', '*');

      return res.status(200).send(buffer);

    } catch (err) {
      // Mark edge as having failed and handle timeout
      console.error(`[Router Error] Forwarding to ${selectedEdge.name} failed:`, err.message);
      selectedEdge.consecutiveFailures++;
      selectedEdge.status = 'UNHEALTHY';

      const actualDurationMs = Date.now() - requestStart;
      recordDecision({
        file: safeFilename,
        strategy: currentStrategy,
        selectedEdge: selectedEdge.name,
        edgePort: selectedEdge.port,
        simulatedLatencyMs: selectedEdge.simulatedLatencyMs,
        actualDurationMs,
        status: 504,
        error: err.message
      });

      return res.status(504).json({
        error: `Edge server timeout: Failed to connect to ${selectedEdge.name} (Port :${selectedEdge.port})`,
        selectedEdge: selectedEdge.name,
        details: err.message
      });
    }
  };

  app.get('/cdn/content/:filename', handleCdnContent);
  app.get('/content/:filename', handleCdnContent);

  /**
   * GET /cdn/decisions
   * Returns list of recorded routing decisions
   */
  app.get('/cdn/decisions', (req, res) => {
    res.status(200).json({
      total: routingDecisions.length,
      decisions: routingDecisions
    });
  });

  /**
   * GET /health
   */
  app.get(['/health', '/router/health'], (req, res) => {
    res.status(200).json({
      status: 'healthy',
      role: 'cdn-router',
      port: PORT,
      strategy: currentStrategy,
      uptime: Math.floor((Date.now() - startTime) / 1000)
    });
  });

  /**
   * EJS Diagnostic Page
   */
  app.get(['/', '/router', '/diagnostics'], (req, res) => {
    res.render('router', {
      port: PORT,
      strategy: currentStrategy,
      edges,
      decisions: routingDecisions.slice(0, 15),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000)
    });
  });

  // Cleanup helper
  const close = () => {
    clearInterval(probeTimer);
  };

  return { app, edges, selectEdge, close, PORT, checkAllEdges };
}

// Standalone start
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { app, PORT } = createRouterApp();
  app.listen(PORT, () => {
    console.log(`[Mini CDN Router] Server running on http://localhost:${PORT}`);
    console.log(`[Mini CDN Router] Diagnostics: http://localhost:${PORT}/router`);
    console.log(`[Mini CDN Router] Endpoints: GET /cdn/content/:filename, GET /cdn/config, PUT /cdn/config, GET /cdn/edges`);
  });
}
