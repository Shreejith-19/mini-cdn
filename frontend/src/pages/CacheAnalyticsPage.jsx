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
  TrendingUp,
  FileCode,
  Trash2,
  Server,
  ArrowUpRight,
  ShieldCheck,
  X,
  AlertOctagon
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
import { clearAllEdgeCaches, clearEdgeCache } from '../services/api';

const defaultEdgeNodes = [
  { id: 'mumbai', name: 'Mumbai Edge', city: 'Mumbai', port: 8001, region: 'Asia-South' },
  { id: 'singapore', name: 'Singapore Edge', city: 'Singapore', port: 8002, region: 'Asia-Southeast' },
  { id: 'frankfurt', name: 'Frankfurt Edge', city: 'Frankfurt', port: 8003, region: 'Europe-Central' },
  { id: 'newyork', name: 'New York Edge', city: 'New York', port: 8004, region: 'US-East' },
];

export default function CacheAnalyticsPage() {
  const context = useOutletContext() || {};
  const { data, refresh } = context;

  const [purging, setPurging] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [edgeToPurge, setEdgeToPurge] = useState(null); // null = all, or port number
  const [purgeNotice, setPurgeNotice] = useState(null);

  const overview = data?.metrics?.overview;
  const bandwidth = data?.metrics?.bandwidth;
  const metricsEdges = data?.metrics?.edges || [];
  const originFiles = data?.origin?.files || [];

  // Key metrics
  const overallHitRatio = overview?.cacheHitRatio !== undefined ? `${Number(overview.cacheHitRatio).toFixed(1)}%` : '0.0%';
  const overallHitRatioNum = overview?.cacheHitRatio !== undefined ? Number(overview.cacheHitRatio) : 0;
  const totalHits = overview?.totalCacheHits ?? 0;
  const totalMisses = overview?.totalCacheMisses ?? 0;
  const originRequests = overview?.totalOriginRequests ?? 0;
  const bandwidthSaved = bandwidth?.bandwidthSavedFormatted || '0 B';

  // Per-edge cache performance data
  const perEdgeData = defaultEdgeNodes.map(node => {
    const found = metricsEdges.find(
      e => e.id?.toLowerCase().includes(node.id) || e.name?.toLowerCase().includes(node.city.toLowerCase()) || e.port === node.port
    );
    const edgeServerData = data?.edges?.find(e => e.port === node.port);
    const cachedCount = edgeServerData?.stats?.cacheObjectCount || 0;

    const hits = found?.cacheHits || 0;
    const misses = found?.cacheMisses || 0;
    const total = found?.totalRequests || (hits + misses) || 0;
    const ratio = total > 0 ? parseFloat(((hits / total) * 100).toFixed(1)) : 0;

    return {
      ...node,
      totalRequests: total,
      hits,
      misses,
      hitRatio: ratio,
      cachedCount,
      bytesServed: found?.bytesServedFormatted || '0 B',
      status: found?.healthStatus || 'HEALTHY'
    };
  });

  // Chart 1: Bar chart of Hits vs Misses by Node
  const edgeChartData = perEdgeData.map(e => ({
    edge: e.city,
    hits: e.hits,
    misses: e.misses,
    ratio: e.hitRatio
  }));

  // Chart 2: Global Cache Hit/Miss Distribution Pie Chart
  const distributionData = [
    { name: 'Cache Hits (RAM)', value: totalHits, color: '#10b981' },
    { name: 'Cache Misses (Origin Fetches)', value: totalMisses, color: '#f59e0b' },
  ];
  const hasTraffic = (totalHits + totalMisses) > 0;
  const fallbackPie = [
    { name: 'Cache Hits', value: 85, color: '#10b981' },
    { name: 'Cache Misses', value: 15, color: '#f59e0b' },
  ];
  const activePieData = hasTraffic ? distributionData : fallbackPie;

  /**
   * Execute cache purge action
   */
  async function handleConfirmPurge() {
    setShowConfirmModal(false);
    setPurging(true);
    setPurgeNotice(null);

    try {
      if (edgeToPurge) {
        await clearEdgeCache(edgeToPurge);
        setPurgeNotice(`Cache successfully purged on Port :${edgeToPurge}.`);
      } else {
        await clearAllEdgeCaches();
        setPurgeNotice('Successfully purged in-memory LRU caches across all 4 Edge Servers (Mumbai, Singapore, Frankfurt, New York).');
      }

      if (refresh) await refresh();
      setTimeout(() => setPurgeNotice(null), 5000);
    } catch (err) {
      alert(`Purge failed: ${err.message}`);
    } finally {
      setPurging(false);
      setEdgeToPurge(null);
    }
  }

  function triggerPurgeAllConfirmation() {
    setEdgeToPurge(null);
    setShowConfirmModal(true);
  }

  function triggerSinglePurgeConfirmation(port, name) {
    setEdgeToPurge(port);
    setShowConfirmModal(true);
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Page Header                                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cache Analytics & Efficiency</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time telemetry on in-memory LRU cache hit ratios, object eviction behaviors, and origin offload distribution.
          </p>
        </div>

        {/* Global Cache Purge Action Button (Requires Confirmation) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={purging}
            onClick={triggerPurgeAllConfirmation}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-xs font-bold text-rose-700 shadow-sm transition"
            title="Clear all 4 edge caches (requires confirmation)"
          >
            <Trash2 className={`w-3.5 h-3.5 text-rose-600 ${purging ? 'animate-spin' : ''}`} />
            <span>{purging ? 'Purging Caches...' : 'Clear All Four Edge Caches'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {purgeNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{purgeNotice}</span>
          </div>
          <button type="button" onClick={() => setPurgeNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Section 1: Top KPI Metric Cards (Required 4 Metrics)         */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Cache Hit Ratio */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Hit Ratio</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{overallHitRatio}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, overallHitRatioNum)}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600">Offload</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Cache Hits */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cache Hits</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{totalHits.toLocaleString()}</div>
            <span className="text-xs text-blue-600 font-medium">Served directly from memory</span>
          </div>
        </div>

        {/* Metric 3: Total Cache Misses */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cache Misses</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{totalMisses.toLocaleString()}</div>
            <span className="text-xs text-amber-600 font-medium">Uncached asset lookups</span>
          </div>
        </div>

        {/* Metric 4: Origin Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Origin Requests</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{originRequests.toLocaleString()}</div>
            <span className="text-xs text-purple-600 font-medium">Authoritative storage fetches</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Section 2: Cache Hit/Miss Distribution Visualizations        */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Global Cache Hit / Miss Ratio Donut */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cache Hit/Miss Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Ratio of cached responses vs origin roundtrips</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {overallHitRatio} Hit Ratio
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between h-64">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {activePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val) => [val.toLocaleString(), 'Requests']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full sm:w-1/2 space-y-3 text-xs pr-4">
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-slate-800">Cache Hits</span>
                </div>
                <span className="font-bold text-emerald-700">{totalHits.toLocaleString()}</span>
              </div>

              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="font-semibold text-slate-800">Cache Misses</span>
                </div>
                <span className="font-bold text-amber-700">{totalMisses.toLocaleString()}</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500 flex justify-between">
                <span>Egress Bandwidth Saved:</span>
                <span className="font-semibold text-slate-900">{bandwidthSaved}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Hits vs Misses across Edge Nodes */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Per-Edge Hits vs Misses Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cache performance across 4 independent edge servers</p>
            </div>
            <span className="text-[11px] text-slate-400">Node Comparison</span>
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
                <Bar dataKey="hits" name="Cache Hits" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="misses" name="Cache Misses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Section 3: Dedicated Per-Edge Cache Performance Table         */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Per-Edge Cache Performance</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live statistics and LRU occupancy for each independent Point of Presence (PoP)
            </p>
          </div>
          <span className="text-xs text-slate-400">Cache Capacity: 100 entries &bull; TTL: 60s</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Edge Node</th>
                <th className="py-2.5 px-4">Port</th>
                <th className="py-2.5 px-4">Health</th>
                <th className="py-2.5 px-4">Total Requests</th>
                <th className="py-2.5 px-4">Cache Hits</th>
                <th className="py-2.5 px-4">Cache Misses</th>
                <th className="py-2.5 px-4">Hit Ratio</th>
                <th className="py-2.5 px-4">In-Memory Objects</th>
                <th className="py-2.5 px-4">Bytes Served</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perEdgeData.map(node => (
                <tr key={node.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-slate-400" />
                      <span>{node.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal">{node.region}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">:{node.port}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${
                      node.status === 'HEALTHY'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${node.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {node.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{node.totalRequests.toLocaleString()}</td>
                  <td className="py-3 px-4 font-mono text-emerald-600 font-semibold">{node.hits.toLocaleString()}</td>
                  <td className="py-3 px-4 font-mono text-amber-600 font-semibold">{node.misses.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, node.hitRatio)}%` }}
                        ></div>
                      </div>
                      <span className="font-mono font-bold text-slate-800 text-xs">{node.hitRatio}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{node.cachedCount} / 100</td>
                  <td className="py-3 px-4 text-slate-600">{node.bytesServed}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      disabled={purging}
                      onClick={() => triggerSinglePurgeConfirmation(node.port, node.name)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 bg-white hover:bg-rose-50 rounded transition disabled:opacity-50"
                      title={`Clear cache on ${node.name}`}
                    >
                      Clear Cache
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Section 4: Authoritative Origin Files Table                   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Authoritative Origin Content Catalog</h3>
            <p className="text-xs text-slate-500 mt-0.5">Static files stored on Origin Server (:8000) cached by edge nodes</p>
          </div>
          <span className="text-xs text-slate-400">{originFiles.length} assets available</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Filename</th>
                <th className="py-2.5 px-4">Content-Type</th>
                <th className="py-2.5 px-4">Size</th>
                <th className="py-2.5 px-4">Origin Path</th>
                <th className="py-2.5 px-4">Cache Policy</th>
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
                        LRU Eligible (60s TTL)
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Confirmation Modal for Clearing Caches                       */}
      {/* ------------------------------------------------------------- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {edgeToPurge ? `Purge Cache on Port :${edgeToPurge}?` : 'Purge All Four Edge Caches?'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {edgeToPurge
                    ? `This will flush all in-memory LRU cache entries on Port :${edgeToPurge}. Subsequent requests to this node will result in cache misses and trigger authoritative origin fetches.`
                    : 'This action will immediately flush all in-memory LRU cached objects across Mumbai, Singapore, Frankfurt, and New York edge servers. All subsequent client requests will result in cold cache misses until repopulated.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Confirmation required: This operation cannot be reversed.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurge}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Purge Caches</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
