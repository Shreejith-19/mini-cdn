import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Database,
  Zap,
  HardDrive,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  FileCode,
  Trash2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { clearAllEdgeCaches } from '../services/api';

const defaultEdgeCache = [
  { edge: 'Mumbai', hits: 0, misses: 0, hitRatio: 0 },
  { edge: 'Singapore', hits: 0, misses: 0, hitRatio: 0 },
  { edge: 'Frankfurt', hits: 0, misses: 0, hitRatio: 0 },
  { edge: 'New York', hits: 0, misses: 0, hitRatio: 0 },
];

const contentDistribution = [
  { name: 'Images (SVG, PNG, JPG)', value: 45, color: '#2563eb' },
  { name: 'JSON Payloads', value: 30, color: '#38bdf8' },
  { name: 'CSS & JavaScript', value: 15, color: '#818cf8' },
  { name: 'HTML & Text Documents', value: 10, color: '#94a3b8' },
];

export default function CacheAnalyticsPage() {
  const context = useOutletContext() || {};
  const { data, refresh } = context;

  const [purging, setPurging] = useState(false);

  const overview = data?.metrics?.overview;
  const cacheMetrics = data?.metrics?.cache;
  const bandwidth = data?.metrics?.bandwidth;
  const metricsEdges = data?.metrics?.edges || [];
  const originFiles = data?.origin?.files || [];

  const overallHitRatio = overview?.cacheHitRatio !== undefined ? `${Number(overview.cacheHitRatio).toFixed(1)}%` : '0.0%';
  const totalHits = overview?.totalCacheHits ?? 0;
  const totalMisses = overview?.totalCacheMisses ?? 0;
  const bandwidthSaved = bandwidth?.bandwidthSavedFormatted || '0 B';

  // Live bar chart data
  const edgeChartData = defaultEdgeCache.map(def => {
    const found = metricsEdges.find(e => e.id?.toLowerCase().includes(def.edge.toLowerCase()) || e.name?.toLowerCase().includes(def.edge.toLowerCase()));
    if (found) {
      return {
        edge: def.edge,
        hits: found.cacheHits || 0,
        misses: found.cacheMisses || 0,
        hitRatio: found.cacheHitRatio || 0
      };
    }
    return def;
  });

  async function handlePurgeAll() {
    if (!confirm('Flush all in-memory LRU caches across all 4 Edge Servers (Mumbai, Singapore, Frankfurt, New York)?')) return;
    setPurging(true);
    try {
      await clearAllEdgeCaches();
      if (refresh) await refresh();
    } catch (err) {
      alert(`Purge failed: ${err.message}`);
    } finally {
      setPurging(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cache Analytics & Efficiency</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deep dive into in-memory LRU cache hit ratios, object eviction behaviors, and origin offload ratios.
          </p>
        </div>

        <button
          type="button"
          disabled={purging}
          onClick={handlePurgeAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold text-slate-700 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${purging ? 'animate-spin' : ''}`} />
          <span>{purging ? 'Purging Caches...' : 'Purge All Edge Caches'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Hit Ratio</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">{overallHitRatio}</div>
            <span className="text-xs text-emerald-600 font-medium">Real-time origin offload rate</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cache Hits</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">{totalHits.toLocaleString()}</div>
            <span className="text-xs text-slate-400">Zero origin latency impact</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cache Misses</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">{totalMisses.toLocaleString()}</div>
            <span className="text-xs text-slate-400">Fetched from Origin (:8000)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Egress Bandwidth Saved</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">{bandwidthSaved}</div>
            <span className="text-xs text-purple-600 font-medium">Saved from origin server</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Hits vs Misses by Edge */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cache Hits vs Misses by Node</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution across the 4 independent edge servers</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={edgeChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="edge" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="hits" name="Cache Hits" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="misses" name="Cache Misses" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Content-Type Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cached Asset Types</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution of supported static content formats</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between h-64">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {contentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full sm:w-1/2 space-y-2 text-xs pr-4">
              {contentDistribution.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Authoritative Origin Files Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Authoritative Origin Content Catalog</h3>
            <p className="text-xs text-slate-500 mt-0.5">Storage assets stored on Origin Server (:8000) eligible for edge caching</p>
          </div>
          <span className="text-xs text-slate-400">Capacity: 100 per node &bull; TTL: 60s</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Filename</th>
                <th className="py-2.5 px-4">Content-Type</th>
                <th className="py-2.5 px-4">Size</th>
                <th className="py-2.5 px-4">Origin URI</th>
                <th className="py-2.5 px-4">Caching Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {originFiles.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-slate-400 text-xs font-sans">
                    Connecting to Origin Storage (:8000)...
                  </td>
                </tr>
              ) : (
                originFiles.map(file => (
                  <tr key={file.filename} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-blue-600">
                      {file.filename}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-sans">
                      {file.mimeType}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-sans">
                      {file.sizeFormatted || `${file.size} B`}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {file.url}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        LRU Eligible (60s)
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
