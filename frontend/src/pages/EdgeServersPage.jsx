import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Server,
  Zap,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Cpu,
  RefreshCw,
  HardDrive,
  Clock,
  X,
  Activity,
  ArrowRight,
  Database,
  Layers,
  FileText
} from 'lucide-react';
import {
  simulateEdgeFailure,
  recoverEdge,
  clearEdgeCache,
  fetchEdgeStats,
  fetchEdgeCache
} from '../services/api';

const defaultEdgeConfigs = [
  { id: 'mumbai', name: 'Mumbai Edge', city: 'Mumbai', country: 'India', location: 'Mumbai, India', port: 8001, simulatedLatencyMs: 35 },
  { id: 'singapore', name: 'Singapore Edge', city: 'Singapore', country: 'Singapore', location: 'Singapore', port: 8002, simulatedLatencyMs: 80 },
  { id: 'frankfurt', name: 'Frankfurt Edge', city: 'Frankfurt', country: 'Germany', location: 'Frankfurt, Germany', port: 8003, simulatedLatencyMs: 150 },
  { id: 'newyork', name: 'New York Edge', city: 'New York', country: 'United States', location: 'New York, USA', port: 8004, simulatedLatencyMs: 180 },
];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function EdgeServersPage() {
  const context = useOutletContext() || {};
  const { data, refresh } = context;

  const [actionLoading, setActionLoading] = useState({});
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [edgeDetails, setEdgeDetails] = useState({ stats: null, cacheObjects: [], loading: false });

  const routerEdges = data?.router?.edges || [];
  const metricsEdges = data?.metrics?.edges || [];
  const edgeProbeStats = data?.edges || [];

  // Merge router data, metrics data, and probe stats
  const edges = defaultEdgeConfigs.map(def => {
    const rEdge = routerEdges.find(e => e.id === def.id || e.port === def.port) || {};
    const mEdge = metricsEdges.find(e => e.id === def.id || e.port === def.port) || {};
    const pEdge = edgeProbeStats.find(e => e.port === def.port)?.stats || {};

    const isDisabled = Boolean(rEdge.disabled || mEdge.disabled);
    const hasFailures = (rEdge.consecutiveFailures > 0 && !isDisabled);
    
    // Exact status indicator logic:
    // Green: Healthy
    // Red: Offline
    // Yellow: Degraded
    let statusLabel = 'Healthy';
    let statusColor = 'green';

    if (isDisabled || rEdge.status === 'UNHEALTHY' || rEdge.healthStatus === 'UNHEALTHY') {
      statusLabel = 'Offline';
      statusColor = 'red';
    } else if (hasFailures || rEdge.status === 'DEGRADED') {
      statusLabel = 'Degraded';
      statusColor = 'yellow';
    }

    const totalRequests = mEdge.requestsHandled || rEdge.totalRequests || pEdge.totalRequests || 0;
    const cacheHits = mEdge.cacheHits || pEdge.cacheHits || 0;
    const cacheMisses = mEdge.cacheMisses || pEdge.cacheMisses || 0;
    const hitRatio = mEdge.cacheHitRatioFormatted || rEdge.cacheHitRatio || (totalRequests > 0 ? `${((cacheHits / totalRequests) * 100).toFixed(1)}%` : '0.0%');
    const bytesServed = mEdge.bytesServedFormatted || pEdge.bytesServedFormatted || formatBytes(pEdge.bytesServed || 0);
    const cachedObjectsCount = pEdge.cachedObjectCount ?? (cacheHits > 0 ? Math.min(100, cacheHits) : 0);

    return {
      id: def.id,
      name: def.name,
      location: def.location,
      port: def.port,
      simulatedLatencyMs: rEdge.simulatedLatencyMs || def.simulatedLatencyMs,
      disabled: isDisabled,
      statusLabel,
      statusColor,
      totalRequests,
      cacheHits,
      cacheMisses,
      hitRatio,
      bytesServed,
      cachedObjectsCount,
      uptime: pEdge.uptime || 0
    };
  });

  // Fetch detailed statistics when modal opens
  useEffect(() => {
    if (!selectedEdge) return;

    let isMounted = true;
    setEdgeDetails({ stats: null, cacheObjects: [], loading: true });

    async function loadDetails() {
      try {
        const [statsResult, cacheResult] = await Promise.all([
          fetchEdgeStats(selectedEdge.port).catch(() => ({ stats: null })),
          fetchEdgeCache(selectedEdge.port).catch(() => ({ objects: [] }))
        ]);

        if (isMounted) {
          setEdgeDetails({
            stats: statsResult.stats,
            cacheObjects: cacheResult.objects || [],
            loading: false
          });
        }
      } catch {
        if (isMounted) {
          setEdgeDetails({ stats: null, cacheObjects: [], loading: false });
        }
      }
    }

    loadDetails();
    return () => { isMounted = false; };
  }, [selectedEdge?.port]);

  // Actions calling actual backend endpoints
  async function handleSimulateFailure(edgeId) {
    setActionLoading(prev => ({ ...prev, [edgeId]: true }));
    try {
      await simulateEdgeFailure(edgeId);
      if (refresh) await refresh();
      if (selectedEdge?.id === edgeId) {
        setSelectedEdge(prev => prev ? { ...prev, disabled: true, statusLabel: 'Offline', statusColor: 'red' } : null);
      }
    } catch (err) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [edgeId]: false }));
    }
  }

  async function handleRecoverServer(edgeId) {
    setActionLoading(prev => ({ ...prev, [edgeId]: true }));
    try {
      await recoverEdge(edgeId);
      if (refresh) await refresh();
      if (selectedEdge?.id === edgeId) {
        setSelectedEdge(prev => prev ? { ...prev, disabled: false, statusLabel: 'Healthy', statusColor: 'green' } : null);
      }
    } catch (err) {
      alert(`Recovery failed: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [edgeId]: false }));
    }
  }

  async function handleClearCache(port, name) {
    if (!confirm(`Clear in-memory LRU cache on ${name} (Port :${port})?`)) return;
    setActionLoading(prev => ({ ...prev, [port]: true }));
    try {
      await clearEdgeCache(port);
      if (refresh) await refresh();
      // Also refresh details modal if open
      setEdgeDetails(prev => ({
        ...prev,
        stats: prev.stats ? { ...prev.stats, cachedObjectCount: 0 } : null,
        cacheObjects: []
      }));
    } catch (err) {
      alert(`Clear cache failed: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [port]: false }));
    }
  }

  function renderStatusBadge(color, label) {
    if (color === 'red') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          {label}
        </span>
      );
    }
    if (color === 'yellow') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          {label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        {label}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Edge Servers Fleet</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Independent geographic Points of Presence (PoPs) with autonomous LRU caches and failure simulation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Status Indicators:</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Healthy
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Degraded
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Offline
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Four Edge Server Cards                                   */}
      {/* Mumbai, Singapore, Frankfurt, New York                   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {edges.map(edge => (
          <div
            key={edge.id}
            className={`bg-white border rounded-xl p-5 shadow-sm space-y-4 transition ${
              edge.statusColor === 'red'
                ? 'border-rose-200 bg-rose-50/20'
                : edge.statusColor === 'yellow'
                ? 'border-amber-200 bg-amber-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Top Node Header: Location, Port, Health Status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  edge.statusColor === 'red'
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : edge.statusColor === 'yellow'
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{edge.name}</h3>
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      :{edge.port}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{edge.location}</span>
                </div>
              </div>

              {renderStatusBadge(edge.statusColor, edge.statusLabel)}
            </div>

            {/* Metrics Breakdown Grid: Latency, Requests, Hits, Misses, Hit Ratio, Cached Objects */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Config Latency</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">{edge.simulatedLatencyMs} ms</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Total Requests</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">{edge.totalRequests.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Cache Hit Ratio</span>
                <span className="text-sm font-bold text-blue-600 mt-0.5 block">{edge.hitRatio}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Cache Hits</span>
                <span className="text-xs font-semibold text-emerald-600 mt-0.5 block">{edge.cacheHits.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Cache Misses</span>
                <span className="text-xs font-semibold text-amber-600 mt-0.5 block">{edge.cacheMisses.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Cached Objects</span>
                <span className="text-xs font-bold text-purple-600 mt-0.5 block">{edge.cachedObjectsCount} / 100</span>
              </div>
            </div>

            {/* Cached Objects Visual Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  In-Memory LRU Cache Usage
                </span>
                <span className="font-semibold text-slate-700">{edge.cachedObjectsCount}% capacity</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, edge.cachedObjectsCount)}%` }}
                />
              </div>
            </div>

            {/* Interactions Bar: View Details, Clear Cache, Simulate Failure, Recover Server */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedEdge(edge)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading[edge.port]}
                  onClick={() => handleClearCache(edge.port, edge.name)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition flex items-center gap-1.5 shadow-sm"
                  title="Purge this edge's LRU cache"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Clear Cache</span>
                </button>

                {edge.disabled ? (
                  <button
                    type="button"
                    disabled={actionLoading[edge.id]}
                    onClick={() => handleRecoverServer(edge.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${actionLoading[edge.id] ? 'animate-spin' : ''}`} />
                    <span>Recover Server</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoading[edge.id]}
                    onClick={() => handleSimulateFailure(edge.id)}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-semibold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Simulate Failure</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ======================================================== */}
      {/* View Details Slide-Over / Modal Panel                    */}
      {/* Displays comprehensive statistics and recent requests   */}
      {/* ======================================================== */}
      {selectedEdge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedEdge.name}</h3>
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Port :{selectedEdge.port}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{selectedEdge.location}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {renderStatusBadge(selectedEdge.statusColor, selectedEdge.statusLabel)}
                <button
                  type="button"
                  onClick={() => setSelectedEdge(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Detailed Statistics Cards */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Edge Performance Metrics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Requests</span>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">{selectedEdge.totalRequests.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Cache Hit Ratio</span>
                    <div className="text-lg font-bold text-blue-600 mt-0.5">{selectedEdge.hitRatio}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Cache Hits / Misses</span>
                    <div className="text-xs font-bold text-slate-800 mt-1">
                      <span className="text-emerald-600">{selectedEdge.cacheHits.toLocaleString()}</span> / <span className="text-amber-600">{selectedEdge.cacheMisses.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Data Egress</span>
                    <div className="text-lg font-bold text-purple-600 mt-0.5">{selectedEdge.bytesServed}</div>
                  </div>
                </div>
              </div>

              {/* Cached Objects Table (from GET /cache) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    In-Memory LRU Cached Objects ({edgeDetails.cacheObjects.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">Max Capacity: 100 &bull; TTL: 60s</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  {edgeDetails.loading ? (
                    <div className="py-8 text-center text-slate-400">Loading cache metadata...</div>
                  ) : edgeDetails.cacheObjects.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 font-sans">
                      Cache is empty. Send a request to populate this edge node's in-memory cache.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                            <th className="py-2 px-3">Cache Key</th>
                            <th className="py-2 px-3">Size</th>
                            <th className="py-2 px-3">Hits</th>
                            <th className="py-2 px-3">Expires In</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                          {edgeDetails.cacheObjects.map(obj => (
                            <tr key={obj.key} className="hover:bg-white transition-colors">
                              <td className="py-2 px-3 font-semibold text-blue-600 truncate max-w-[200px]">{obj.key}</td>
                              <td className="py-2 px-3 text-slate-600 font-sans">{obj.sizeFormatted || `${obj.size} B`}</td>
                              <td className="py-2 px-3 text-slate-900 font-semibold font-sans">{obj.hits || 1}</td>
                              <td className="py-2 px-3 font-sans text-emerald-600 font-medium">{obj.expiresInSec}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Edge Node Recent Requests Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Recent Requests Processed by {selectedEdge.name}
                </h4>

                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  {(() => {
                    const matchedRequests = (data?.metrics?.requests || []).filter(
                      r => r.selectedEdge?.toLowerCase().includes(selectedEdge.id) || r.selectedEdge?.toLowerCase().includes(selectedEdge.name.toLowerCase())
                    );

                    if (matchedRequests.length === 0) {
                      return (
                        <div className="py-6 text-center text-slate-400 font-sans">
                          No recent requests logged for this edge node in buffer.
                        </div>
                      );
                    }

                    return (
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left font-mono text-[11px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-semibold text-[10px]">
                              <th className="py-2 px-3">Request ID</th>
                              <th className="py-2 px-3">Filename</th>
                              <th className="py-2 px-3">Cache</th>
                              <th className="py-2 px-3">Latency</th>
                              <th className="py-2 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60">
                            {matchedRequests.slice(0, 10).map(req => (
                              <tr key={req.requestId || req.id} className="hover:bg-white transition-colors">
                                <td className="py-2 px-3 text-slate-500">{req.requestId || req.id}</td>
                                <td className="py-2 px-3 font-semibold text-slate-900">{req.requestedFilename || req.filename}</td>
                                <td className="py-2 px-3 font-sans">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    req.cacheStatus === 'HIT'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {req.cacheStatus}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-700 font-semibold">{req.responseLatency ?? req.latencyMs ?? 0} ms</td>
                                <td className="py-2 px-3 font-sans text-emerald-600 font-semibold">{req.httpStatusCode || 200}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer Controls: Clear Cache, Simulate Failure, Recover Server */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <a
                href={`http://localhost:${selectedEdge.port}/`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-600 hover:text-blue-600 flex items-center gap-1 font-semibold transition"
              >
                <span>Open Diagnostic Web Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading[selectedEdge.port]}
                  onClick={() => handleClearCache(selectedEdge.port, selectedEdge.name)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium transition flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Clear Cache</span>
                </button>

                {selectedEdge.disabled ? (
                  <button
                    type="button"
                    disabled={actionLoading[selectedEdge.id]}
                    onClick={() => handleRecoverServer(selectedEdge.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${actionLoading[selectedEdge.id] ? 'animate-spin' : ''}`} />
                    <span>Recover Server</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoading[selectedEdge.id]}
                    onClick={() => handleSimulateFailure(selectedEdge.id)}
                    className="px-3.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-semibold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Simulate Failure</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
