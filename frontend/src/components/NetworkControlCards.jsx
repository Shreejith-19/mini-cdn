import React, { useState } from 'react';
import { Compass, Database, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { updateRouterStrategy, clearAllEdgeCaches } from '../services/api';

export default function NetworkControlCards({ origin, router, onActionSuccess }) {
  const [updatingStrategy, setUpdatingStrategy] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  async function handleStrategyChange(e) {
    const newStrategy = e.target.value;
    setUpdatingStrategy(true);
    try {
      await updateRouterStrategy(newStrategy);
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      alert(`Failed to update strategy: ${err.message}`);
    } finally {
      setUpdatingStrategy(false);
    }
  }

  async function handleClearAll() {
    if (!confirm('Clear all in-memory caches across ALL 4 Edge Servers (Mumbai, Singapore, Frankfurt, New York)?')) return;
    setClearingAll(true);
    try {
      await clearAllEdgeCaches();
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      alert(`Clear all failed: ${err.message}`);
    } finally {
      setClearingAll(false);
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const originStats = origin?.stats || {};
  const originFiles = origin?.files || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Central CDN Router Card (:9000) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Central CDN Router
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                    Port :9000
                  </span>
                </h4>
                <p className="text-xs text-slate-400">Intelligent Request Routing &amp; Failover</p>
              </div>
            </div>

            <a
              href="http://localhost:9000/router"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-sky-400 transition flex items-center gap-1"
            >
              Router UI <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-slate-300 font-medium">Active Routing Algorithm:</span>
              <div className="flex items-center gap-2">
                <select
                  value={router?.strategy || 'ROUND_ROBIN'}
                  onChange={handleStrategyChange}
                  disabled={updatingStrategy}
                  className="bg-slate-950 border border-slate-700 text-sky-400 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="ROUND_ROBIN">1. Round Robin (Sequential Distribution)</option>
                  <option value="LOWEST_LATENCY">2. Lowest Latency (Fastest Edge: Mumbai 35ms)</option>
                </select>
                {updatingStrategy && <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {router?.strategy === 'LOWEST_LATENCY'
                ? '⚡ Lowest Latency routes to the closest healthy edge (Mumbai 35ms, Singapore 80ms, Frankfurt 150ms, NYC 180ms).'
                : '🔄 Round Robin distributes sequential requests across active edge servers (Mumbai → Singapore → Frankfurt → NYC).'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Total proxy decisions: <strong className="text-white">{router?.decisions?.length || 0}</strong>
          </span>

          <button
            onClick={handleClearAll}
            disabled={clearingAll}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition text-xs font-semibold flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {clearingAll ? 'Purging...' : 'Global Purge (All 4 Edges)'}
          </button>
        </div>
      </div>

      {/* Authoritative Origin Server Card (:8000) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Central Authoritative Origin
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                    Port :8000
                  </span>
                </h4>
                <p className="text-xs text-slate-400">Authoritative File Repository &amp; Storage</p>
              </div>
            </div>

            <a
              href="http://localhost:8000/origin"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-sky-400 transition flex items-center gap-1"
            >
              Origin UI <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-3">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Storage Files</span>
              <div className="text-lg font-bold text-white mt-0.5">{originFiles.length}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Origin Requests</span>
              <div className="text-lg font-bold text-white mt-0.5">{originStats.totalRequests || 0}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Origin Egress</span>
              <div className="text-lg font-bold text-white mt-0.5">{formatBytes(originStats.bytesServed || 0)}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Supported Formats: JPG, PNG, WebP, PDF, MP4, TXT, JSON</span>
          <span className="text-emerald-400 font-medium">Authoritative Source</span>
        </div>
      </div>
    </div>
  );
}

