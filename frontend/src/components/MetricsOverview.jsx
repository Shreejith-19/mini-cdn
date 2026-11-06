import React from 'react';
import { Activity, Database, Server, Zap, Globe, ShieldCheck } from 'lucide-react';

export default function MetricsOverview({ data }) {
  if (!data) return null;

  const { origin, router, edges } = data;

  // Aggregate stats across all healthy edges
  let totalRequests = 0;
  let totalHits = 0;
  let totalMisses = 0;
  let totalBytes = 0;
  let totalCachedObjects = 0;
  let healthyEdgesCount = 0;

  edges.forEach(e => {
    if (e.status === 'HEALTHY' && e.stats) {
      healthyEdgesCount++;
      totalRequests += e.stats.totalRequests || 0;
      totalHits += e.stats.cacheHits || 0;
      totalMisses += e.stats.cacheMisses || 0;
      totalBytes += e.stats.bytesServed || 0;
      totalCachedObjects += e.stats.cachedObjectCount || 0;
    }
  });

  const globalHitRatio = totalRequests > 0
    ? ((totalHits / totalRequests) * 100).toFixed(1)
    : '0.0';

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Global Cache Hit Ratio */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Global Hit Ratio</span>
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-white">{globalHitRatio}%</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {totalHits} Hits &bull; {totalMisses} Misses
          </div>
        </div>
      </div>

      {/* Total Network Requests */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Edge Requests</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-white">{totalRequests}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Served across 4 PoPs
          </div>
        </div>
      </div>

      {/* Cached Objects in Memory */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In-Memory Objects</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-white">{totalCachedObjects}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Stored in LRU Map caches
          </div>
        </div>
      </div>

      {/* Edge Bandwidth Served */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Egress</span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-white">{formatBytes(totalBytes)}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Delivered directly from edge
          </div>
        </div>
      </div>

      {/* Active Nodes Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Mesh Nodes</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-white">
            {healthyEdgesCount + (origin?.status === 'HEALTHY' ? 1 : 0) + (router?.status === 'HEALTHY' ? 1 : 0)} / 6
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Origin + Router + 4 Edges
          </div>
        </div>
      </div>
    </div>
  );
}

