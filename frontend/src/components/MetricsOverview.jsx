import React from 'react';
import { Activity, Database, Server, Zap, Globe, ShieldCheck, Clock, ArrowDownRight } from 'lucide-react';

export default function MetricsOverview({ data }) {
  if (!data) return null;

  const { origin, router, edges, metrics } = data;
  const overview = metrics?.overview;

  // Fallback edge aggregations
  let fallbackRequests = 0;
  let fallbackHits = 0;
  let fallbackMisses = 0;
  let fallbackBytes = 0;
  let totalCachedObjects = 0;
  let healthyEdgesCount = 0;

  if (Array.isArray(edges)) {
    edges.forEach(e => {
      if (e.status === 'HEALTHY' && e.stats) {
        healthyEdgesCount++;
        fallbackRequests += e.stats.totalRequests || 0;
        fallbackHits += e.stats.cacheHits || 0;
        fallbackMisses += e.stats.cacheMisses || 0;
        fallbackBytes += e.stats.bytesServed || 0;
        totalCachedObjects += e.stats.cachedObjectCount || 0;
      }
    });
  }

  // Use authoritative backend metrics module when available, otherwise fall back to probe aggregates
  const totalRequests = overview?.totalRequests ?? fallbackRequests;
  const totalHits = overview?.totalCacheHits ?? fallbackHits;
  const totalMisses = overview?.totalCacheMisses ?? fallbackMisses;
  const globalHitRatio = overview?.cacheHitRatio !== undefined
    ? Number(overview.cacheHitRatio).toFixed(1)
    : (totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(1) : '0.0');

  const totalBytes = overview?.totalBytesServed ?? fallbackBytes;
  const totalOriginRequests = overview?.totalOriginRequests ?? (origin?.stats?.totalRequests || fallbackMisses);
  const avgLatency = overview?.averageResponseLatency !== undefined
    ? Number(overview.averageResponseLatency).toFixed(1)
    : '0.0';

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      {/* Global Cache Hit Ratio */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cache Hit Ratio</span>
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-white">{globalHitRatio}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {totalHits} Hits &bull; {totalMisses} Misses
          </div>
        </div>
      </div>

      {/* Total Requests */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Requests</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-white">{totalRequests}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            All routed traffic
          </div>
        </div>
      </div>

      {/* Origin Requests */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Origin Requests</span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <ArrowDownRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-white">{totalOriginRequests}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            Cache miss fetches
          </div>
        </div>
      </div>

      {/* Bandwidth Served */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bytes Served</span>
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-white">{formatBytes(totalBytes)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            Delivered across PoPs
          </div>
        </div>
      </div>

      {/* Average Response Latency */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Latency</span>
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-white">{avgLatency} ms</div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            Mean roundtrip time
          </div>
        </div>
      </div>

      {/* Active Nodes Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Nodes</span>
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-white">
            {healthyEdgesCount + (origin?.status === 'HEALTHY' ? 1 : 0) + (router?.status === 'HEALTHY' ? 1 : 0)} / 6
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            Origin + Router + 4 Edges
          </div>
        </div>
      </div>
    </div>
  );
}
