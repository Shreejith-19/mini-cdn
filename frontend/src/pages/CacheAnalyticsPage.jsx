import React from 'react';
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
  FileCode
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

const cachePerformanceByEdge = [
  { edge: 'Mumbai', hits: 381000, misses: 31400, hitRatio: 92.4 },
  { edge: 'Singapore', hits: 343200, misses: 42000, hitRatio: 89.1 },
  { edge: 'Frankfurt', hits: 278400, misses: 42400, hitRatio: 86.8 },
  { edge: 'New York', hits: 264600, misses: 45950, hitRatio: 85.2 },
];

const contentDistribution = [
  { name: 'Images (SVG, PNG, JPG)', value: 45, color: '#2563eb' },
  { name: 'JSON Payloads', value: 30, color: '#38bdf8' },
  { name: 'CSS & JavaScript', value: 15, color: '#818cf8' },
  { name: 'HTML & Text Documents', value: 10, color: '#94a3b8' },
];

const cachedHotObjects = [
  { key: '/origin/content/styles.css', type: 'text/css', size: '501 B', hits: 48200, ttl: '42s remaining', etag: '"3a1b4c9f"' },
  { key: '/origin/content/banner.svg', type: 'image/svg+xml', size: '3.6 KB', hits: 39100, ttl: '28s remaining', etag: '"7e2d9a11"' },
  { key: '/origin/content/data.json', type: 'application/json', size: '191 B', hits: 34500, ttl: '51s remaining', etag: '"f4c08e1a"' },
  { key: '/origin/content/script.js', type: 'application/javascript', size: '233 B', hits: 29800, ttl: '35s remaining', etag: '"9b2a7e43"' },
  { key: '/origin/content/large-payload.json', type: 'application/json', size: '2.1 KB', hits: 21400, ttl: '19s remaining', etag: '"18ef55ac"' },
];

export default function CacheAnalyticsPage() {
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Purge All Edge Caches</span>
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
            <div className="text-2xl font-bold text-slate-900">88.4%</div>
            <span className="text-xs text-emerald-600 font-medium">+2.1% origin offload rate</span>
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
            <div className="text-2xl font-bold text-slate-900">1,267,200</div>
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
            <div className="text-2xl font-bold text-slate-900">161,750</div>
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
            <div className="text-2xl font-bold text-slate-900">4.82 TB</div>
            <span className="text-xs text-purple-600 font-medium">78% saved from origin server</span>
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
              <BarChart data={cachePerformanceByEdge} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
              <p className="text-xs text-slate-500 mt-0.5">Breakdown of objects stored in edge in-memory caches</p>
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

      {/* Hot Cached Objects Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Hot Cached Assets</h3>
            <p className="text-xs text-slate-500 mt-0.5">Frequently requested files currently held in edge RAM</p>
          </div>
          <span className="text-xs text-slate-400">Default TTL: 60s &bull; Max: 100 objects</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Cache Key / URI</th>
                <th className="py-2.5 px-4">Content-Type</th>
                <th className="py-2.5 px-4">Size</th>
                <th className="py-2.5 px-4">Hit Count</th>
                <th className="py-2.5 px-4">TTL Status</th>
                <th className="py-2.5 px-4">ETag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {cachedHotObjects.map(obj => (
                <tr key={obj.key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-blue-600">
                    {obj.key}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-sans">
                    {obj.type}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {obj.size}
                  </td>
                  <td className="py-3 px-4 text-slate-900 font-semibold font-sans">
                    {obj.hits.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {obj.ttl}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {obj.etag}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

