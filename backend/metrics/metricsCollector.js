/**
 * Metrics Collector Module
 * 
 * Collects, aggregates, and stores real-time metrics across the Mini CDN
 * infrastructure using actual backend activity.
 * 
 * Tracks:
 * - Global metrics (requests, cache hits/misses, origin requests, bytes, failed requests, average latency)
 * - Per-edge metrics (requests handled, cache hits/misses, bytes, average latency, health status)
 * - Bounded recent request history (request ID, filename, selected edge, cache status, latency, timestamp, status code)
 */

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export class MetricsCollector {
  constructor(options = {}) {
    this.maxHistory = options.maxHistory || 100;
    this.startTime = Date.now();
    this.requestCounter = 0;

    // Global aggregated metrics
    this.global = {
      totalRequests: 0,
      totalCacheHits: 0,
      totalCacheMisses: 0,
      totalOriginRequests: 0,
      totalBytesServed: 0,
      originBytesServed: 0,
      failedRequests: 0,
      totalLatencyMs: 0,
      latencyCount: 0
    };

    // Pre-configured edge definitions matching CDN specification
    this.edges = [
      {
        id: 'mumbai',
        name: 'Mumbai Edge',
        location: 'Mumbai, India',
        port: 8001,
        configuredLatencyMs: 35,
        healthStatus: 'HEALTHY',
        disabled: false,
        requestsHandled: 0,
        cacheHits: 0,
        cacheMisses: 0,
        bytesServed: 0,
        totalLatencyMs: 0,
        latencyCount: 0
      },
      {
        id: 'singapore',
        name: 'Singapore Edge',
        location: 'Singapore',
        port: 8002,
        configuredLatencyMs: 80,
        healthStatus: 'HEALTHY',
        disabled: false,
        requestsHandled: 0,
        cacheHits: 0,
        cacheMisses: 0,
        bytesServed: 0,
        totalLatencyMs: 0,
        latencyCount: 0
      },
      {
        id: 'frankfurt',
        name: 'Frankfurt Edge',
        location: 'Frankfurt, Germany',
        port: 8003,
        configuredLatencyMs: 150,
        healthStatus: 'HEALTHY',
        disabled: false,
        requestsHandled: 0,
        cacheHits: 0,
        cacheMisses: 0,
        bytesServed: 0,
        totalLatencyMs: 0,
        latencyCount: 0
      },
      {
        id: 'newyork',
        name: 'New York Edge',
        location: 'New York, USA',
        port: 8004,
        configuredLatencyMs: 180,
        healthStatus: 'HEALTHY',
        disabled: false,
        requestsHandled: 0,
        cacheHits: 0,
        cacheMisses: 0,
        bytesServed: 0,
        totalLatencyMs: 0,
        latencyCount: 0
      }
    ];

    // Bounded in-memory request history
    this.requestHistory = [];
  }

  /**
   * Helper to locate edge by id, name, or port
   */
  findEdge(identifier) {
    if (!identifier) return null;
    const str = String(identifier).trim().toLowerCase();
    return this.edges.find(
      e =>
        e.id.toLowerCase() === str ||
        e.name.toLowerCase() === str ||
        `edge-${e.id.toLowerCase()}` === str ||
        String(e.port) === str
    );
  }

  /**
   * Update health status of an edge node
   */
  updateEdgeHealth(edgeIdentifier, { healthStatus, status, disabled } = {}) {
    const edge = this.findEdge(edgeIdentifier);
    if (!edge) return;

    if (disabled !== undefined) {
      edge.disabled = Boolean(disabled);
    }

    const newStatus = healthStatus || status;
    if (newStatus) {
      edge.healthStatus = edge.disabled ? 'UNHEALTHY' : newStatus;
    }
  }

  /**
   * Record a completed CDN request event
   * 
   * @param {Object} event
   * @param {string} event.filename - Name of requested file
   * @param {string|number} event.edgeId - Identifier, name, or port of selected edge
   * @param {string} event.edgeName - Display name of edge
   * @param {string} event.cacheStatus - 'HIT' or 'MISS'
   * @param {number} event.latencyMs - Response latency in milliseconds
   * @param {number} event.statusCode - HTTP status code
   * @param {number} event.bytes - Number of bytes transferred
   * @param {string} [event.requestId] - Optional request id
   */
  recordRequest(event) {
    const {
      filename,
      edgeId,
      edgeName,
      cacheStatus,
      latencyMs = 0,
      statusCode = 200,
      bytes = 0,
      requestId
    } = event;

    const safeLatency = typeof latencyMs === 'number' && !isNaN(latencyMs) ? Math.max(0, latencyMs) : 0;
    const safeBytes = typeof bytes === 'number' && !isNaN(bytes) ? Math.max(0, bytes) : 0;
    const isError = statusCode >= 400;
    const normalizedCache = String(cacheStatus || 'UNKNOWN').toUpperCase();

    // 1. Update Global Metrics
    this.global.totalRequests++;

    if (isError) {
      this.global.failedRequests++;
    }

    if (normalizedCache === 'HIT') {
      this.global.totalCacheHits++;
    } else if (normalizedCache === 'MISS') {
      this.global.totalCacheMisses++;
      this.global.totalOriginRequests++;
      this.global.originBytesServed += safeBytes;
    }

    this.global.totalBytesServed += safeBytes;
    this.global.totalLatencyMs += safeLatency;
    this.global.latencyCount++;

    // 2. Update Per-Edge Metrics
    const edge = this.findEdge(edgeId || edgeName);
    if (edge) {
      edge.requestsHandled++;
      if (normalizedCache === 'HIT') {
        edge.cacheHits++;
      } else if (normalizedCache === 'MISS') {
        edge.cacheMisses++;
      }
      edge.bytesServed += safeBytes;
      edge.totalLatencyMs += safeLatency;
      edge.latencyCount++;
    }

    // 3. Record in bounded in-memory request history
    this.requestCounter++;
    const id = requestId || `req-${Date.now()}-${String(this.requestCounter).padStart(4, '0')}`;
    const selectedEdgeDisplay = edge ? edge.name : (edgeName || 'None');

    const historyRecord = {
      requestId: id,
      requestedFilename: filename || 'unknown',
      filename: filename || 'unknown',
      selectedEdge: selectedEdgeDisplay,
      cacheStatus: normalizedCache,
      responseLatency: Math.round(safeLatency),
      latencyMs: Math.round(safeLatency),
      timestamp: new Date().toISOString(),
      httpStatusCode: statusCode,
      statusCode: statusCode
    };

    this.requestHistory.unshift(historyRecord);

    // Keep history strictly bounded
    if (this.requestHistory.length > this.maxHistory) {
      this.requestHistory.pop();
    }

    return historyRecord;
  }

  /**
   * GET /api/metrics/overview
   */
  getOverview() {
    const totalRequests = this.global.totalRequests;
    const totalHits = this.global.totalCacheHits;
    const totalMisses = this.global.totalCacheMisses;
    const hitRatio = totalRequests > 0
      ? parseFloat(((totalHits / totalRequests) * 100).toFixed(2))
      : 0.0;

    const avgLatency = this.global.latencyCount > 0
      ? parseFloat((this.global.totalLatencyMs / this.global.latencyCount).toFixed(2))
      : 0.0;

    const activeEdges = this.edges.filter(e => !e.disabled && e.healthStatus === 'HEALTHY').length;

    return {
      totalRequests,
      totalCacheHits: totalHits,
      totalCacheMisses: totalMisses,
      cacheHits: totalHits,
      cacheMisses: totalMisses,
      overallCacheHitRatio: hitRatio,
      cacheHitRatio: hitRatio,
      cacheHitRate: `${hitRatio.toFixed(1)}%`,
      cacheHitRatioFormatted: `${hitRatio.toFixed(1)}%`,
      totalOriginRequests: this.global.totalOriginRequests,
      originRequests: this.global.totalOriginRequests,
      totalBytesServed: this.global.totalBytesServed,
      bytesServed: this.global.totalBytesServed,
      totalBandwidthBytes: this.global.totalBytesServed,
      totalBandwidthFormatted: formatBytes(this.global.totalBytesServed),
      totalBytesServedFormatted: formatBytes(this.global.totalBytesServed),
      failedRequests: this.global.failedRequests,
      averageResponseLatency: avgLatency,
      averageLatencyMs: avgLatency,
      averageResponseLatencyFormatted: `${avgLatency.toFixed(1)} ms`,
      activeEdges,
      totalEdges: this.edges.length,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }

  /**
   * GET /api/metrics/edges
   */
  getEdges() {
    return this.edges.map(e => {
      const handled = e.requestsHandled;
      const ratio = handled > 0
        ? parseFloat(((e.cacheHits / handled) * 100).toFixed(2))
        : 0.0;
      const avgLatency = e.latencyCount > 0
        ? parseFloat((e.totalLatencyMs / e.latencyCount).toFixed(2))
        : 0.0;

      return {
        id: e.id,
        name: e.name,
        location: e.location,
        port: e.port,
        healthStatus: e.disabled ? 'UNHEALTHY' : e.healthStatus,
        status: e.disabled ? 'UNHEALTHY' : e.healthStatus,
        disabled: e.disabled,
        requestsHandled: handled,
        totalRequests: handled,
        cacheHits: e.cacheHits,
        cacheMisses: e.cacheMisses,
        cacheHitRatio: ratio,
        cacheHitRatioFormatted: `${ratio.toFixed(1)}%`,
        bytesServed: e.bytesServed,
        bytesServedFormatted: formatBytes(e.bytesServed),
        averageResponseLatency: avgLatency,
        averageLatencyMs: avgLatency,
        averageResponseLatencyFormatted: `${avgLatency.toFixed(1)} ms`,
        configuredLatencyMs: e.configuredLatencyMs,
        configuredLatency: `${e.configuredLatencyMs} ms`
      };
    });
  }

  /**
   * GET /api/metrics/requests
   */
  getRequests(limit) {
    const count = typeof limit === 'number' && limit > 0 ? limit : this.maxHistory;
    return this.requestHistory.slice(0, count);
  }

  /**
   * GET /api/metrics/bandwidth
   */
  getBandwidth() {
    const totalBytes = this.global.totalBytesServed;
    const originBytes = this.global.originBytesServed;
    const edgeBytes = totalBytes;
    const savedBytes = Math.max(0, totalBytes - originBytes);
    const savedPercentage = totalBytes > 0
      ? parseFloat(((savedBytes / totalBytes) * 100).toFixed(2))
      : 0.0;

    return {
      totalBytesServed: totalBytes,
      totalBytesServedFormatted: formatBytes(totalBytes),
      originBytesServed: originBytes,
      originBytesServedFormatted: formatBytes(originBytes),
      edgeBytesServed: edgeBytes,
      edgeBytesServedFormatted: formatBytes(edgeBytes),
      bandwidthSavedBytes: savedBytes,
      bandwidthSavedFormatted: formatBytes(savedBytes),
      bandwidthSavedPercentage: savedPercentage,
      bandwidthSavedPercentageFormatted: `${savedPercentage.toFixed(1)}%`,
      edges: this.edges.map(e => ({
        id: e.id,
        name: e.name,
        port: e.port,
        bytesServed: e.bytesServed,
        bytesServedFormatted: formatBytes(e.bytesServed),
        percentageOfTotal: totalBytes > 0
          ? parseFloat(((e.bytesServed / totalBytes) * 100).toFixed(2))
          : 0.0
      }))
    };
  }

  /**
   * GET /api/metrics/cache
   */
  getCache() {
    const overview = this.getOverview();

    return {
      overallCacheHitRatio: overview.overallCacheHitRatio,
      overallCacheHitRatioFormatted: overview.cacheHitRatioFormatted,
      totalHits: this.global.totalCacheHits,
      totalCacheHits: this.global.totalCacheHits,
      totalMisses: this.global.totalCacheMisses,
      totalCacheMisses: this.global.totalCacheMisses,
      totalOriginRequests: this.global.totalOriginRequests,
      originRequests: this.global.totalOriginRequests,
      edges: this.edges.map(e => {
        const handled = e.requestsHandled;
        const ratio = handled > 0
          ? parseFloat(((e.cacheHits / handled) * 100).toFixed(2))
          : 0.0;
        return {
          id: e.id,
          name: e.name,
          port: e.port,
          requestsHandled: handled,
          cacheHits: e.cacheHits,
          cacheMisses: e.cacheMisses,
          cacheHitRatio: ratio,
          cacheHitRatioFormatted: `${ratio.toFixed(1)}%`
        };
      })
    };
  }

  /**
   * Reset all metric counters and history
   */
  reset() {
    this.startTime = Date.now();
    this.requestCounter = 0;
    this.global = {
      totalRequests: 0,
      totalCacheHits: 0,
      totalCacheMisses: 0,
      totalOriginRequests: 0,
      totalBytesServed: 0,
      originBytesServed: 0,
      failedRequests: 0,
      totalLatencyMs: 0,
      latencyCount: 0
    };

    for (const edge of this.edges) {
      edge.requestsHandled = 0;
      edge.cacheHits = 0;
      edge.cacheMisses = 0;
      edge.bytesServed = 0;
      edge.totalLatencyMs = 0;
      edge.latencyCount = 0;
      edge.disabled = false;
      edge.healthStatus = 'HEALTHY';
    }

    this.requestHistory = [];
  }
}

// Default singleton instance
export const metricsCollector = new MetricsCollector();

