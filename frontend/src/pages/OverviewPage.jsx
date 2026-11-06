import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Activity,
  Zap,
  Globe,
  Clock,
  Server,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

// Default static fallback timeline data
const defaultTrafficData = [
  { time: '00:00', edgeRequests: 420, originFetches: 62 },
  { time: '04:00', edgeRequests: 310, originFetches: 41 },
  { time: '08:00', edgeRequests: 680, originFetches: 85 },
  { time: '12:00', edgeRequests: 950, originFetches: 112 },
  { time: '16:00', edgeRequests: 880, originFetches: 98 },
  { time: '20:00', edgeRequests: 740, originFetches: 81 },
  { time: '24:00', edgeRequests: 580, originFetches: 67 },
];

export default function OverviewPage() {
  const context = useOutletContext() || {};
  const { data } = context;

  const overview = data?.metrics?.overview;
  const router = data?.router;
  const edgesList = data?.metrics?.edges?.length ? data.metrics.edges : (router?.edges || []);
  const requestsList = data?.metrics?.requests || [];
  const bandwidth = data?.metrics?.bandwidth;

  // Authoritative numbers or fallback values
  const totalRequests = overview?.totalRequests !== undefined ? overview.totalRequests.toLocaleString() : '0';
  const hitRatio = overview?.cacheHitRatio !== undefined ? `${Number(overview.cacheHitRatio).toFixed(1)}%` : '0.0%';
  const bandwidthSaved = bandwidth?.bandwidthSavedFormatted || (overview?.totalBytesServedFormatted ? `${overview.totalBytesServedFormatted}` : '0 B');
  const avgLatency = overview?.averageResponseLatency !== undefined ? `${Number(overview.averageResponseLatency).toFixed(1)} ms` : '0.0 ms';
  
  const activeCount = edgesList.filter(e => !e.disabled && (e.status === 'HEALTHY' || e.healthStatus === 'HEALTHY')).length;

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. Key Metrics Cards Row                                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requests</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{totalRequests}</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Live backend telemetry</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Cache Hit Ratio */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cache Hit Ratio</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{hitRatio}</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{overview?.totalCacheHits ?? 0} Hits &bull; {overview?.totalCacheMisses ?? 0} Misses</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Bandwidth Saved */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bandwidth Saved</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{bandwidthSaved}</div>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-1">
              <span>Saved from Origin (:8000)</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Average Latency */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Latency</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{avgLatency}</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Mean request roundtrip</span>
            </div>
          </div>
        </div>

        {/* Metric 5: Active Edge Nodes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Edge Fleet</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{activeCount} / 4</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{activeCount === 4 ? '100% Operational' : `${4 - activeCount} Degraded/Offline`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. Charts Section: Traffic & Bandwidth Volume           */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Network Traffic & Throughput Trends</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison of edge-cached requests served vs authoritative origin fetches.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Edge Requests
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Origin Fetches
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={defaultTrafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="edgeBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="edgeRequests" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#edgeBlue)" name="Edge Requests" />
              <Area type="monotone" dataKey="originFetches" stroke="#cbd5e1" strokeWidth={2} fill="#f8fafc" name="Origin Fetches" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. Edge Fleet Summary & Recent Requests Grid             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edge PoP Fleet Status (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Edge Nodes (PoPs)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time status across 4 independent geographic servers</p>
            </div>
            <Link
              to="/edges"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Manage fleet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Port</th>
                  <th className="py-2.5 px-3">Sim Latency</th>
                  <th className="py-2.5 px-3">Hit Ratio</th>
                  <th className="py-2.5 px-3">Requests</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {edgesList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-slate-400 text-xs">
                      Connecting to edge nodes...
                    </td>
                  </tr>
                ) : (
                  edgesList.map(edge => {
                    const isHealthy = !edge.disabled && (edge.status === 'HEALTHY' || edge.healthStatus === 'HEALTHY');
                    const ratio = edge.cacheHitRatioFormatted || `${Number(edge.cacheHitRatio || 0).toFixed(1)}%`;
                    const latency = edge.configuredLatency || `${edge.simulatedLatencyMs || 0} ms`;

                    return (
                      <tr key={edge.id || edge.port} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{edge.name}</div>
                          <div className="text-[11px] text-slate-400">{edge.location}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">:{edge.port}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{latency}</td>
                        <td className="py-3 px-3 font-semibold text-blue-600">{ratio}</td>
                        <td className="py-3 px-3 text-slate-600">{edge.requestsHandled || edge.totalRequests || 0}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            isHealthy
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {isHealthy ? 'Healthy' : 'Offline'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Requests Stream Preview (1 col on lg) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Requests</h3>
                <p className="text-xs text-slate-500 mt-0.5">Live routing activity</p>
              </div>
              <Link
                to="/requests"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {requestsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No requests recorded in buffer yet.
                </div>
              ) : (
                requestsList.slice(0, 5).map(req => (
                  <div key={req.requestId || req.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 truncate font-mono text-[11px]">
                        {req.requestedFilename || req.filename}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>{req.selectedEdge}</span>
                        <span>&bull;</span>
                        <span>{req.timestamp ? new Date(req.timestamp).toLocaleTimeString() : 'now'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.cacheStatus === 'HIT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {req.cacheStatus}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 w-12 text-right">
                        {req.responseLatency ?? req.latencyMs ?? 0} ms
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-center">
            <Link
              to="/requests"
              className="text-xs font-medium text-slate-600 hover:text-blue-600 transition"
            >
              Inspect full telemetry audit log &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
