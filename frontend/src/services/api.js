/**
 * Modular API client layer for Mini CDN
 * Separates all backend HTTP communication from React UI components.
 */

const ORIGIN_URL = import.meta.env.VITE_ORIGIN_URL || 'http://localhost:8000';
const ROUTER_URL = import.meta.env.VITE_ROUTER_URL || 'http://localhost:9000';

const EDGE_PORTS = [8001, 8002, 8003, 8004];

/**
 * Fetch authoritative origin statistics and file catalog
 */
export async function fetchOriginData() {
  try {
    const [statsRes, filesRes] = await Promise.all([
      fetch(`${ORIGIN_URL}/origin/stats`, { signal: AbortSignal.timeout(2500) }),
      fetch(`${ORIGIN_URL}/origin/files`, { signal: AbortSignal.timeout(2500) })
    ]);

    const stats = statsRes.ok ? await statsRes.json() : null;
    const files = filesRes.ok ? await filesRes.json() : { files: [] };

    return {
      status: stats ? 'HEALTHY' : 'UNREACHABLE',
      url: ORIGIN_URL,
      stats,
      files: files.files || []
    };
  } catch (err) {
    return {
      status: 'UNREACHABLE',
      url: ORIGIN_URL,
      error: err.message,
      stats: null,
      files: []
    };
  }
}

/**
 * Fetch router configuration, edges, and decision log
 */
export async function fetchRouterData() {
  try {
    const [configRes, edgesRes, decisionsRes] = await Promise.all([
      fetch(`${ROUTER_URL}/cdn/config`, { signal: AbortSignal.timeout(2500) }),
      fetch(`${ROUTER_URL}/cdn/edges`, { signal: AbortSignal.timeout(2500) }),
      fetch(`${ROUTER_URL}/cdn/decisions`, { signal: AbortSignal.timeout(2500) })
    ]);

    const config = configRes.ok ? await configRes.json() : { strategy: 'ROUND_ROBIN' };
    const edges = edgesRes.ok ? await edgesRes.json() : [];
    const decisions = decisionsRes.ok ? await decisionsRes.json() : { decisions: [] };

    return {
      status: 'HEALTHY',
      url: ROUTER_URL,
      strategy: config.strategy,
      edges,
      decisions: decisions.decisions || []
    };
  } catch (err) {
    return {
      status: 'UNREACHABLE',
      url: ROUTER_URL,
      error: err.message,
      strategy: 'UNKNOWN',
      edges: [],
      decisions: []
    };
  }
}

/**
 * Update the router's active routing strategy (ROUND_ROBIN or LOWEST_LATENCY)
 */
export async function updateRouterStrategy(strategy) {
  const res = await fetch(`${ROUTER_URL}/cdn/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update routing strategy');
  }

  return await res.json();
}

/**
 * Administrative failure simulation: mark an edge offline
 */
export async function simulateEdgeFailure(edgeId) {
  const res = await fetch(`${ROUTER_URL}/admin/edges/${edgeId}/failure`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to simulate failure for edge ${edgeId}`);
  return await res.json();
}

/**
 * Administrative failure simulation: recover an edge online
 */
export async function recoverEdge(edgeId) {
  const res = await fetch(`${ROUTER_URL}/admin/edges/${edgeId}/recover`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to recover edge ${edgeId}`);
  return await res.json();
}

/**
 * Fetch individual edge server statistics
 */
export async function fetchEdgeStats(port) {
  try {
    const res = await fetch(`http://localhost:${port}/stats`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { port, status: 'UNHEALTHY', stats: null };
    const stats = await res.json();
    return { port, status: 'HEALTHY', stats };
  } catch {
    return { port, status: 'UNHEALTHY', stats: null };
  }
}

/**
 * Fetch in-memory cache metadata for an edge
 */
export async function fetchEdgeCache(port) {
  try {
    const res = await fetch(`http://localhost:${port}/cache`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return { port, count: 0, objects: [] };
    return await res.json();
  } catch {
    return { port, count: 0, objects: [] };
  }
}

/**
 * Clear in-memory cache on a specific edge
 */
export async function clearEdgeCache(port) {
  const res = await fetch(`http://localhost:${port}/cache`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to clear cache on port ${port}`);
  return await res.json();
}

/**
 * Clear cache across all 4 edge servers
 */
export async function clearAllEdgeCaches() {
  const results = await Promise.all(
    EDGE_PORTS.map(port => clearEdgeCache(port).catch(err => ({ port, error: err.message })))
  );
  return results;
}

/**
 * Execute a simulated CDN request through the central router
 * @param {string} filename - Target asset filename
 * @param {Object} [options] - Optional routing config { strategy: 'ROUND_ROBIN' | 'LOWEST_LATENCY', requestId: string }
 */
export async function executeCdnRequest(filename, options = {}) {
  const start = performance.now();
  const queryParams = new URLSearchParams();
  if (options.strategy) {
    queryParams.set('strategy', options.strategy);
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const url = `${ROUTER_URL}/cdn/content/${encodeURIComponent(filename)}${queryString}`;

  const headers = {};
  if (options.strategy) {
    headers['X-Routing-Strategy'] = options.strategy;
  }
  if (options.requestId) {
    headers['X-Request-Id'] = options.requestId;
  }

  const res = await fetch(url, { headers });
  const duration = Math.round(performance.now() - start);

  const requestId = res.headers.get('x-request-id') || options.requestId || `req-${Date.now()}`;
  const selectedEdge = res.headers.get('x-selected-edge') || 'Unknown';
  const simulatedLatency = res.headers.get('x-edge-simulated-latency') || '0ms';
  const actualDuration = res.headers.get('x-actual-request-duration') || `${duration}ms`;
  const strategy = res.headers.get('x-routing-strategy') || options.strategy || 'ROUND_ROBIN';
  const cacheStatus = res.headers.get('x-cache') || 'UNKNOWN';
  const originContacted = res.headers.get('x-origin-contacted') || (cacheStatus === 'MISS' ? 'Yes' : 'No');
  const contentType = res.headers.get('content-type') || 'text/plain';
  const etag = res.headers.get('etag') || 'N/A';
  const edgePort = res.headers.get('x-edge-port') || '';

  let body = '';
  if (contentType.includes('json') || contentType.includes('text') || contentType.includes('svg')) {
    body = await res.text();
  } else {
    body = `[Binary content: ${contentType}]`;
  }

  return {
    success: res.ok,
    status: res.status,
    statusCode: res.status,
    requestId,
    url,
    filename,
    selectedEdge,
    edgePort,
    simulatedLatency,
    actualDuration,
    clientDurationMs: duration,
    latencyMs: duration,
    strategy,
    cacheStatus,
    originContacted,
    contentType,
    etag,
    body
  };
}

/**
 * Execute a direct request to an individual edge server (bypassing router)
 */
export async function executeDirectEdgeRequest(port, filename) {
  const start = performance.now();
  const url = `http://localhost:${port}/content/${encodeURIComponent(filename)}`;

  const res = await fetch(url);
  const duration = Math.round(performance.now() - start);

  const cacheStatus = res.headers.get('x-cache') || 'UNKNOWN';
  const cacheEdge = res.headers.get('x-cache-edge') || `Edge :${port}`;
  const contentType = res.headers.get('content-type') || 'text/plain';
  const etag = res.headers.get('etag') || 'N/A';

  const originContacted = res.headers.get('x-origin-contacted') || (cacheStatus === 'MISS' ? 'Yes' : 'No');
  const requestId = res.headers.get('x-request-id') || `req-direct-${Date.now()}`;

  let body = '';
  if (contentType.includes('json') || contentType.includes('text') || contentType.includes('svg')) {
    body = await res.text();
  } else {
    body = `[Binary data: ${contentType}]`;
  }

  return {
    success: res.ok,
    status: res.status,
    statusCode: res.status,
    requestId,
    filename,
    selectedEdge: cacheEdge,
    url,
    port,
    durationMs: duration,
    latencyMs: duration,
    cacheStatus,
    cacheEdge,
    originContacted,
    contentType,
    etag,
    body
  };
}

/**
 * Fetch global metrics overview from the backend metrics module
 */
export async function fetchMetricsOverview() {
  try {
    const res = await fetch(`${ROUTER_URL}/api/metrics/overview`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch per-edge metrics from the backend metrics module
 */
export async function fetchMetricsEdges() {
  try {
    const res = await fetch(`${ROUTER_URL}/api/metrics/edges`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.edges || []);
  } catch {
    return [];
  }
}

/**
 * Fetch recent request history from the backend metrics module
 */
export async function fetchMetricsRequests(limit = 50) {
  try {
    const res = await fetch(`${ROUTER_URL}/api/metrics/requests?limit=${limit}`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.requests || []);
  } catch {
    return [];
  }
}

/**
 * Fetch bandwidth distribution metrics
 */
export async function fetchMetricsBandwidth() {
  try {
    const res = await fetch(`${ROUTER_URL}/api/metrics/bandwidth`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch cache efficiency metrics
 */
export async function fetchMetricsCache() {
  try {
    const res = await fetch(`${ROUTER_URL}/api/metrics/cache`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch unified CDN network snapshot
 */
export async function fetchFullNetworkSnapshot() {
  const [origin, router, metricsOverview, metricsEdges, metricsRequests, metricsBandwidth, metricsCache, ...edgeResults] = await Promise.all([
    fetchOriginData(),
    fetchRouterData(),
    fetchMetricsOverview(),
    fetchMetricsEdges(),
    fetchMetricsRequests(30),
    fetchMetricsBandwidth(),
    fetchMetricsCache(),
    ...EDGE_PORTS.map(p => fetchEdgeStats(p))
  ]);

  return {
    timestamp: new Date().toISOString(),
    origin,
    router,
    metrics: {
      overview: metricsOverview,
      edges: metricsEdges,
      requests: metricsRequests,
      bandwidth: metricsBandwidth,
      cache: metricsCache
    },
    edges: edgeResults
  };
}
