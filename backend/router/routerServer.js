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
      disabled: false,
      lastChecked: null,
      consecutiveFailures: 0,
      requestsRouted: 0,
      totalRequests: 0,
      cacheHitRatio: '0.0%'
    },
    {
      id: 'singapore',
      name: 'Singapore Edge',
      location: 'Singapore',
      port: 8002,
      url: process.env.EDGE_SINGAPORE_URL || 'http://localhost:8002',
      simulatedLatencyMs: 80,
      status: 'HEALTHY',
      disabled: false,
      lastChecked: null,
      consecutiveFailures: 0,
      requestsRouted: 0,
      totalRequests: 0,
      cacheHitRatio: '0.0%'
    },
    {
      id: 'frankfurt',
      name: 'Frankfurt Edge',
      location: 'Frankfurt, Germany',
      port: 8003,
      url: process.env.EDGE_FRANKFURT_URL || 'http://localhost:8003',
      simulatedLatencyMs: 150,
      status: 'HEALTHY',
      disabled: false,
      lastChecked: null,
      consecutiveFailures: 0,
      requestsRouted: 0,
      totalRequests: 0,
      cacheHitRatio: '0.0%'
    },
    {
      id: 'newyork',
      name: 'New York Edge',
      location: 'New York, USA',
      port: 8004,
      url: process.env.EDGE_NEWYORK_URL || 'http://localhost:8004',
      simulatedLatencyMs: 180,
      status: 'HEALTHY',
      disabled: false,
      lastChecked: null,
      consecutiveFailures: 0,
      requestsRouted: 0,
      totalRequests: 0,
      cacheHitRatio: '0.0%'
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
   * Helper to find edge by ID, name, or port
   */
  function findEdge(identifier) {
    if (!identifier) return null;
    const str = String(identifier).trim().toLowerCase();
    return edges.find(
      e =>
        e.id.toLowerCase() === str ||
        `edge-${e.id.toLowerCase()}` === str ||
        e.name.toLowerCase() === str ||
        String(e.port) === str
    );
  }

  /**
   * Periodically check edge server using /health endpoint
   * Marks edge UNHEALTHY if it repeatedly fails health checks.
   * Automatically resumes routing when it becomes healthy again.
   */
  async function probeEdge(edge) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const [healthRes, statsRes] = await Promise.all([
        fetch(`${edge.url}/health`, { signal: controller.signal }),
        fetch(`${edge.url}/stats`, { signal: controller.signal }).catch(() => null)
      ]);
      clearTimeout(timeout);

      if (healthRes.ok) {
        edge.status = 'HEALTHY';
        edge.consecutiveFailures = 0;

        // Update dashboard metrics from edge stats
        if (statsRes && statsRes.ok) {
          const statsData = await statsRes.json();
          edge.totalRequests = statsData.totalRequests || edge.requestsRouted;
          edge.cacheHitRatio = statsData.cacheHitRatio || '0.0%';
        }
      } else {
        edge.consecutiveFailures++;
        if (edge.consecutiveFailures >= 2) {
          edge.status = 'UNHEALTHY';
        }
      }
    } catch {
      edge.consecutiveFailures++;
      if (edge.consecutiveFailures >= 2) {
        edge.status = 'UNHEALTHY';
      }
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
   * Selects an edge server based on active routing strategy.
   * NEVER routes new requests to unhealthy or administratively disabled edges.
   */
  function selectEdge() {
    // Only route to edges that are HEALTHY and NOT administratively disabled
    const availableEdges = edges.filter(e => !e.disabled && e.status === 'HEALTHY');

    if (availableEdges.length === 0) {
      return null;
    }

    if (currentStrategy === STRATEGIES.LOWEST_LATENCY) {
      // Pick available edge with lowest configured simulatedLatencyMs
      let lowest = availableEdges[0];
      for (const edge of availableEdges) {
        if (edge.simulatedLatencyMs < lowest.simulatedLatencyMs) {
          lowest = edge;
        }
      }
      return lowest;
    }

    // Default: ROUND_ROBIN sequentially across available healthy edges
    const selected = availableEdges[roundRobinIndex % availableEdges.length];
    roundRobinIndex = (roundRobinIndex + 1) % availableEdges.length;
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
   * GET /cdn/edges and GET /admin/edges
   * Expose: Edge name, Location, Health status, Configured latency, Total requests, Cache hit ratio
   */
  const getEdgesHandler = (req, res) => {
    res.status(200).json(
      edges.map(e => ({
        id: e.id,
        name: e.name,
        location: e.location,
        status: e.disabled ? 'UNHEALTHY (SIMULATED FAILURE)' : e.status,
        healthStatus: e.status,
        disabled: e.disabled,
        configuredLatency: `${e.simulatedLatencyMs} ms`,
        simulatedLatencyMs: e.simulatedLatencyMs,
        totalRequests: e.totalRequests || e.requestsRouted || 0,
        cacheHitRatio: e.cacheHitRatio || '0.0%',
        port: e.port,
        url: e.url,
        lastChecked: e.lastChecked
      }))
    );
  };

  app.get('/cdn/edges', getEdgesHandler);
  app.get('/admin/edges', getEdgesHandler);

  /**
   * Failure Simulation Endpoints
   * POST /admin/edges/:id/failure: Manually mark an edge offline for testing
   */
  const handleFailure = (req, res) => {
    const edgeId = req.params.id || req.body?.id;
    const edge = findEdge(edgeId);

    if (!edge) {
      return res.status(404).json({
        error: `Edge not found: "${edgeId}". Available edges: mumbai, singapore, frankfurt, newyork`
      });
    }

    // Set administrative disabled flag separately from actual probe result
    edge.disabled = true;

    res.status(200).json({
      message: `Edge "${edge.name}" marked offline for failure testing`,
      edge: {
        id: edge.id,
        name: edge.name,
        location: edge.location,
        disabled: edge.disabled,
        status: 'UNHEALTHY (SIMULATED FAILURE)'
      }
    });
  };

  app.post('/admin/edges/:id/failure', handleFailure);
  app.post('/admin/edges/failure', handleFailure);

  /**
   * POST /admin/edges/:id/recover: Restore the edge to service
   */
  const handleRecover = (req, res) => {
    const edgeId = req.params.id || req.body?.id;
    const edge = findEdge(edgeId);

    if (!edge) {
      return res.status(404).json({
        error: `Edge not found: "${edgeId}". Available edges: mumbai, singapore, frankfurt, newyork`
      });
    }

    // Restore administrative flag and reset failures
    edge.disabled = false;
    edge.status = 'HEALTHY';
    edge.consecutiveFailures = 0;

    res.status(200).json({
      message: `Edge "${edge.name}" restored online and available for routing`,
      edge: {
        id: edge.id,
        name: edge.name,
        location: edge.location,
        disabled: edge.disabled,
        status: edge.status
      }
    });
  };

  app.post('/admin/edges/:id/recover', handleRecover);
  app.post('/admin/edges/recover', handleRecover);

  /**
   * GET /cdn/content/:filename
   * Selects an edge server, forwards request, returns edge response.
   * Stops sending requests to unhealthy or disabled edges.
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
        strategy: currentStrategy,
        availableHealthyEdges: 0
      });
    }

    selectedEdge.requestsRouted++;
    selectedEdge.totalRequests++;

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
    const healthyCount = edges.filter(e => !e.disabled && e.status === 'HEALTHY').length;

    res.status(200).json({
      status: 'healthy',
      role: 'cdn-router',
      port: PORT,
      strategy: currentStrategy,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      totalEdges: edges.length,
      availableHealthyEdges: healthyCount
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

  return { app, edges, selectEdge, close, PORT, checkAllEdges, probeEdge };
}

// Standalone start
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { app, PORT } = createRouterApp();
  app.listen(PORT, () => {
    console.log(`[Mini CDN Router] Server running on http://localhost:${PORT}`);
    console.log(`[Mini CDN Router] Diagnostics: http://localhost:${PORT}/router`);
    console.log(`[Mini CDN Router] Admin simulation: POST /admin/edges/:id/failure & POST /admin/edges/:id/recover`);
  });
}
