import React, { useState } from 'react';
import { Server, Zap, Trash2, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { simulateEdgeFailure, recoverEdge, clearEdgeCache } from '../services/api';

export default function EdgeNodesGrid({ edges = [], onActionSuccess }) {
  const [loadingAction, setLoadingAction] = useState({});

  async function handleToggleFailure(edgeId, isCurrentlyDisabled) {
    setLoadingAction(prev => ({ ...prev, [edgeId]: true }));
    try {
      if (isCurrentlyDisabled) {
        await recoverEdge(edgeId);
      } else {
        await simulateEdgeFailure(edgeId);
      }
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setLoadingAction(prev => ({ ...prev, [edgeId]: false }));
    }
  }

  async function handleClearCache(port, edgeName) {
    if (!confirm(`Clear in-memory cache for ${edgeName} (Port ${port})?`)) return;
    setLoadingAction(prev => ({ ...prev, [port]: true }));
    try {
      await clearEdgeCache(port);
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      alert(`Clear cache failed: ${err.message}`);
    } finally {
      setLoadingAction(prev => ({ ...prev, [port]: false }));
    }
  }

  // Pre-defined static edge info if dynamic edges are still loading
  const defaultEdges = [
    { id: 'mumbai', name: 'Mumbai Edge', port: 8001, location: 'Mumbai, India', simulatedLatencyMs: 35 },
    { id: 'singapore', name: 'Singapore Edge', port: 8002, location: 'Singapore', simulatedLatencyMs: 80 },
    { id: 'frankfurt', name: 'Frankfurt Edge', port: 8003, location: 'Frankfurt, Germany', simulatedLatencyMs: 150 },
    { id: 'newyork', name: 'New York Edge', port: 8004, location: 'New York, USA', simulatedLatencyMs: 180 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-400" />
          Independent Edge Servers (4 PoPs)
        </h3>
        <span className="text-xs text-slate-400">
          Independent In-Memory LRU Map Caches (Capacity: 100, TTL: 60s)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {defaultEdges.map((fallback) => {
          // Find matching live edge data
          const edgeData = edges.find(e => e.id === fallback.id || e.port === fallback.port) || fallback;
          const isHealthy = edgeData.status === 'HEALTHY' && !edgeData.disabled;
          const isDisabled = edgeData.disabled || String(edgeData.status).includes('SIMULATED');
          const stats = edgeData.stats || {};
          const hitRatioNumeric = stats.cacheHitRatioNumeric || parseFloat(stats.cacheHitRatio || '0') || 0;

          return (
            <div
              key={fallback.id}
              className={`rounded-xl border p-4 transition flex flex-col justify-between ${
                isDisabled
                  ? 'bg-rose-950/20 border-rose-800/40'
                  : isHealthy
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-amber-950/20 border-amber-800/40'
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDisabled
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-sky-500/10 text-sky-400'
                      }`}
                    >
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">{fallback.name}</h4>
                      <p className="text-[11px] text-slate-400">Port :{fallback.port}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isDisabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
                        OFFLINE
                      </span>
                    ) : isHealthy ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        HEALTHY
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        UNHEALTHY
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  Location: <span className="text-slate-300 font-medium">{fallback.location}</span>
                </div>

                {/* Metrics Breakdown */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Configured Latency:</span>
                    <span className="font-semibold text-sky-400">{fallback.simulatedLatencyMs} ms</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Cache Hit Ratio:</span>
                    <span className="font-semibold text-white">{stats.cacheHitRatio || '0.0%'}</span>
                  </div>

                  {/* Hit ratio progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, hitRatioNumeric))}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Hits: <strong className="text-emerald-400">{stats.cacheHits || 0}</strong></span>
                    <span>Misses: <strong className="text-amber-400">{stats.cacheMisses || 0}</strong></span>
                    <span>Cached: <strong className="text-indigo-400">{stats.cachedObjectCount || 0}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  {/* Simulate Failure / Recover Button */}
                  <button
                    disabled={loadingAction[fallback.id]}
                    onClick={() => handleToggleFailure(fallback.id, isDisabled)}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition border ${
                      isDisabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                    }`}
                  >
                    {loadingAction[fallback.id]
                      ? '...'
                      : isDisabled
                      ? 'Restore Online'
                      : 'Simulate Failure'}
                  </button>

                  {/* Clear Cache Button */}
                  <button
                    disabled={loadingAction[fallback.port]}
                    onClick={() => handleClearCache(fallback.port, fallback.name)}
                    title="Clear in-memory cache"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition bg-slate-800/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <a
                  href={`http://localhost:${fallback.port}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-center text-slate-400 hover:text-sky-400 transition flex items-center justify-center gap-1 pt-0.5"
                >
                  Edge Diagnostics (EJS)
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

