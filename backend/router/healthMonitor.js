/**
 * Active Health Monitor for CDN Edge Nodes
 * 
 * Periodically probes edge servers to track availability and latency.
 * Enables intelligent failover if an edge node becomes unreachable.
 */

export class EdgeHealthMonitor {
  constructor(options = {}) {
    this.probeIntervalMs = options.probeIntervalMs || 5000;
    this.timer = null;

    this.edges = [
      {
        id: 'edge-mumbai',
        name: 'Mumbai Edge',
        city: 'Mumbai',
        region: 'Asia-South',
        port: 8001,
        url: process.env.EDGE_MUMBAI_URL || 'http://localhost:8001',
        coordinates: [19.0760, 72.8777],
        simulatedLatencyMs: 8,
        status: 'HEALTHY',
        lastPingMs: 8,
        lastChecked: null,
        consecutiveFailures: 0,
        requestsRouted: 0
      },
      {
        id: 'edge-singapore',
        name: 'Singapore Edge',
        city: 'Singapore',
        region: 'Asia-Southeast',
        port: 8002,
        url: process.env.EDGE_SINGAPORE_URL || 'http://localhost:8002',
        coordinates: [1.3521, 103.8198],
        simulatedLatencyMs: 12,
        status: 'HEALTHY',
        lastPingMs: 12,
        lastChecked: null,
        consecutiveFailures: 0,
        requestsRouted: 0
      },
      {
        id: 'edge-frankfurt',
        name: 'Frankfurt Edge',
        city: 'Frankfurt',
        region: 'Europe-Central',
        port: 8003,
        url: process.env.EDGE_FRANKFURT_URL || 'http://localhost:8003',
        coordinates: [50.1109, 8.6821],
        simulatedLatencyMs: 15,
        status: 'HEALTHY',
        lastPingMs: 15,
        lastChecked: null,
        consecutiveFailures: 0,
        requestsRouted: 0
      },
      {
        id: 'edge-newyork',
        name: 'New York Edge',
        city: 'New York',
        region: 'US-East',
        port: 8004,
        url: process.env.EDGE_NEWYORK_URL || 'http://localhost:8004',
        coordinates: [40.7128, -74.0060],
        simulatedLatencyMs: 10,
        status: 'HEALTHY',
        lastPingMs: 10,
        lastChecked: null,
        consecutiveFailures: 0,
        requestsRouted: 0
      }
    ];
  }

  /**
   * Probes a single edge node.
   */
  async probeEdge(edge) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${edge.url}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      const duration = Date.now() - start;

      if (res.ok) {
        edge.status = 'HEALTHY';
        edge.lastPingMs = duration;
        edge.consecutiveFailures = 0;
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
      edge.lastPingMs = null;
    } finally {
      edge.lastChecked = new Date().toISOString();
    }
  }

  /**
   * Probes all edge nodes concurrently.
   */
  async checkAll() {
    await Promise.all(this.edges.map(e => this.probeEdge(e)));
    return this.edges;
  }

  start() {
    if (this.timer) return;
    this.checkAll(); // Immediate initial probe
    this.timer = setInterval(() => this.checkAll(), this.probeIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getEdges() {
    return this.edges;
  }

  recordRoutedRequest(edgeId) {
    const edge = this.edges.find(e => e.id === edgeId);
    if (edge) {
      edge.requestsRouted = (edge.requestsRouted || 0) + 1;
    }
  }
}

