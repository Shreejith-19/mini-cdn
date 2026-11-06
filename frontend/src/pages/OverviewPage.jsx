import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Activity,
  Zap,
  Globe,
  Server,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Clock,
  HardDrive,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Play
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
import RequestSimulator from '../components/RequestSimulator';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const defaultEdgeConfigs = [
  { id: 'mumbai', name: 'Mumbai Edge', location: 'Mumbai, India', port: 8001, simulatedLatencyMs: 35 },
  { id: 'singapore', name: 'Singapore Edge', location: 'Singapore', port: 8002, simulatedLatencyMs: 80 },
  { id: 'frankfurt', name: 'Frankfurt Edge', location: 'Frankfurt, Germany', port: 8003, simulatedLatencyMs: 150 },
  { id: 'newyork', name: 'New York Edge', location: 'New York, USA', port: 8004, simulatedLatencyMs: 180 },
];

export default function OverviewPage() {
  const context = useOutletContext() || {};
  const { data, loading, error, refresh } = context;

  const overview = data?.metrics?.overview;
  const metricsEdges = data?.metrics?.edges || [];
  const routerEdges = data?.router?.edges || [];
  const requestsList = data?.metrics?.requests || [];
  const bandwidthData = data?.metrics?.bandwidth;
  const originFiles = data?.origin?.files || [];

  // Track previous period metrics without fabrication
  const prevSnapshotRef = useRef(null);
  const [metricDeltas, setMetricDeltas] = useState(null);

  // Time-series history for charts
  const [timelineData, setTimelineData] = useState([]);

  useEffect(() => {
    if (!overview) return;

    // Record timeline data point for real-time charts
    const nowLabel = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentPoint = {
      time: nowLabel,
      totalBytes: overview.totalBytesServed || 0,
      totalBytesFormatted: overview.totalBytesServedFormatted || '0 B',
      edgeCachedBytes: bandwidthData?.bandwidthSavedBytes || 0,
      edgeCachedBytesFormatted: bandwidthData?.bandwidthSavedFormatted || '0 B',
      totalRequests: overview.totalRequests || 0,
      cacheHits: overview.totalCacheHits || 0,
      cacheMisses: overview.totalCacheMisses || 0
    };

    setTimelineData(prev => {
      // Keep last 10 points
      const updated = [...prev, currentPoint];
      return updated.slice(-10);
    });

    // Compute genuine comparison with previous period if data exists
    if (prevSnapshotRef.current) {
      const prev = prevSnapshotRef.current;
      setMetricDeltas({
        requestDelta: overview.totalRequests - prev.totalRequests,
        hitRateDelta: parseFloat((overview.cacheHitRatio - prev.cacheHitRatio).toFixed(1)),
        bytesDelta: overview.totalBytesServed - prev.totalBytesServed,
        originDelta: overview.totalOriginRequests - prev.totalOriginRequests
      });
    }

    prevSnapshotRef.current = {
      totalRequests: overview.totalRequests || 0,
      cacheHitRatio: overview.cacheHitRatio || 0,
      totalBytesServed: overview.totalBytesServed || 0,
      totalOriginRequests: overview.totalOriginRequests || 0
    };
  }, [overview?.totalRequests, overview?.totalBytesServed, overview?.cacheHitRatio, bandwidthData?.bandwidthSavedBytes]);

  // Loading State
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Connecting to Mini CDN Infrastructure...</h3>
        <p className="text-xs text-slate-500 mt-1">Polling Origin (:8000), Router (:9000), and 4 Edge PoPs (:8001-:8004)</p>
      </div>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-3 text-rose-600">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-bold">Failed to connect to CDN backend services</h3>
        </div>
        <p className="text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded border border-slate-200">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Merge edge configurations with live backend stats
  const edgeCards = defaultEdgeConfigs.map(def => {
    const mEdge = metricsEdges.find(e => e.id === def.id || e.port === def.port) || {};
    const rEdge = routerEdges.find(e => e.id === def.id || e.port === def.port) || {};

    const isDisabled = Boolean(rEdge.disabled || mEdge.disabled);
    const isHealthy = !isDisabled && (rEdge.status === 'HEALTHY' || rEdge.healthStatus === 'HEALTHY' || mEdge.healthStatus === 'HEALTHY');

    const requestsHandled = mEdge.requestsHandled || rEdge.totalRequests || 0;
    const hitRatio = mEdge.cacheHitRatioFormatted || rEdge.cacheHitRatio || '0.0%';
    const latency = rEdge.configuredLatency || `${def.simulatedLatencyMs} ms`;

    return {
      id: def.id,
      name: def.name,
      location: def.location,
      port: def.port,
      isHealthy,
      requestsHandled,
      hitRatio,
      latency
    };
  });

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* SECTION 1: Metric Cards                                  */}
      {/* Display: Total Requests, Cache Hit Rate,                 */}
      {/*          Total Bandwidth, Origin Requests                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requests</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {(overview?.totalRequests ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] mt-1 font-medium text-slate-500">
              {metricDeltas && metricDeltas.requestDelta !== 0 ? (
                <span className="text-emerald-600 inline-flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  +{metricDeltas.requestDelta} since last poll
                </span>
              ) : (
                <span>All traffic routed through CDN</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Cache Hit Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cache Hit Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {overview?.cacheHitRatio !== undefined ? `${Number(overview.cacheHitRatio).toFixed(1)}%` : '0.0%'}
            </div>
            <div className="text-[11px] mt-1 font-medium text-slate-500">
              {metricDeltas && metricDeltas.hitRateDelta !== 0 ? (
                <span className={metricDeltas.hitRateDelta > 0 ? 'text-emerald-600' : 'text-slate-600'}>
                  {metricDeltas.hitRateDelta > 0 ? `+${metricDeltas.hitRateDelta}%` : `${metricDeltas.hitRateDelta}%`} vs previous
                </span>
              ) : (
                <span>{overview?.totalCacheHits ?? 0} hits &bull; {overview?.totalCacheMisses ?? 0} misses</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Total Bandwidth */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bandwidth</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {overview?.totalBytesServedFormatted || '0 B'}
            </div>
            <div className="text-[11px] mt-1 font-medium text-slate-500">
              {metricDeltas && metricDeltas.bytesDelta > 0 ? (
                <span className="text-purple-600">+{formatBytes(metricDeltas.bytesDelta)} new egress</span>
              ) : (
                <span>Data egress served across 4 PoPs</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Origin Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Origin Requests</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {(overview?.totalOriginRequests ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] mt-1 font-medium text-slate-500">
              {metricDeltas && metricDeltas.originDelta > 0 ? (
                <span className="text-amber-600">+{metricDeltas.originDelta} cache miss fetches</span>
              ) : (
                <span>Direct fetches to Origin (:8000)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2 & 3: Bandwidth Chart & Requests Chart          */}
      {/* Recharts visualizations                                  */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 2: Bandwidth Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bandwidth Volume</h3>
              <p className="text-xs text-slate-500 mt-0.5">Total data served vs cached edge bandwidth</p>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Bytes Egress</span>
          </div>

          <div className="h-64 w-full">
            {timelineData.length < 2 && (overview?.totalBytesServed || 0) === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <HardDrive className="w-6 h-6 mb-1 text-slate-300" />
                <span>No bandwidth recorded yet. Dispatch a test request below.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalBw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => formatBytes(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [formatBytes(value), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="totalBytes" name="Total Bandwidth" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#totalBw)" />
                  <Area type="monotone" dataKey="edgeCachedBytes" name="Edge Cached Bandwidth" stroke="#10b981" strokeWidth={2} fill="#ecfdf5" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Section 3: Requests Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Request Volume Over Time</h3>
              <p className="text-xs text-slate-500 mt-0.5">Throughput distribution (Cache Hits vs Misses)</p>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Request Count</span>
          </div>

          <div className="h-64 w-full">
            {timelineData.length < 2 && (overview?.totalRequests || 0) === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Activity className="w-6 h-6 mb-1 text-slate-300" />
                <span>No requests dispatched yet. Send a request to begin charting.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="cacheHits" name="Cache Hits" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cacheMisses" name="Cache Misses" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: Edge Server Overview                          */}
      {/* Four compact edge server cards                           */}
      {/* Show: Location, Health status, Requests handled,         */}
      {/*       Cache hit ratio, Simulated latency                 */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Edge Server Fleet Overview</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time status across 4 independent Points of Presence (PoPs)</p>
          </div>
          <Link
            to="/edges"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Edge details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {edgeCards.map(edge => (
            <div
              key={edge.id}
              className={`bg-white border rounded-xl p-4 shadow-sm space-y-3 transition ${
                edge.isHealthy ? 'border-slate-200 hover:border-slate-300' : 'border-rose-200 bg-rose-50/20'
              }`}
            >
              {/* Card Header: Location + Status */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{edge.name}</h4>
                  <span className="text-[11px] text-slate-500">{edge.location}</span>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                  edge.isHealthy
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${edge.isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {edge.isHealthy ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>

              {/* Node Details: Requests, Hit Ratio, Latency */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-lg text-center text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Requests</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">{edge.requestsHandled.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Hit Ratio</span>
                  <span className="font-bold text-blue-600 text-xs mt-0.5 block">{edge.hitRatio}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Sim Latency</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">{edge.latency}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                <span>Port :{edge.port}</span>
                <span className="text-slate-500 font-sans">LRU Cache</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 5: Recent Requests                               */}
      {/* Display: Request ID, Filename, Selected edge,            */}
      {/*          Cache HIT/MISS, Response time                   */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Requests</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest client traffic processed by CDN router</p>
          </div>
          <Link
            to="/requests"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View all requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Request ID</th>
                <th className="py-2.5 px-4">Filename</th>
                <th className="py-2.5 px-4">Selected Edge</th>
                <th className="py-2.5 px-4">Cache Status</th>
                <th className="py-2.5 px-4">Response Time</th>
                <th className="py-2.5 px-4">HTTP Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {requestsList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400 font-sans text-xs">
                    No requests recorded yet. Use the Request Simulator below to dispatch traffic.
                  </td>
                </tr>
              ) : (
                requestsList.slice(0, 7).map(req => {
                  const id = req.requestId || req.id;
                  const file = req.requestedFilename || req.filename;
                  const edge = req.selectedEdge || 'None';
                  const cache = req.cacheStatus || 'UNKNOWN';
                  const latency = req.responseLatency ?? req.latencyMs ?? 0;
                  const status = req.httpStatusCode || req.statusCode || 200;

                  return (
                    <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-semibold">{id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{file}</td>
                      <td className="py-3 px-4 text-slate-600 font-sans">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          {edge}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          cache === 'HIT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : cache === 'MISS'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {cache}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {latency} ms
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                          status >= 200 && status < 300
                            ? 'text-emerald-700'
                            : status === 304
                            ? 'text-blue-700'
                            : 'text-rose-700'
                        }`}>
                          {status >= 400 ? <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          {status}
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

      {/* ======================================================== */}
      {/* Interactive Traffic Sandbox                              */}
      {/* Allows testing live requests directly on Overview page   */}
      {/* ======================================================== */}
      <RequestSimulator originFiles={originFiles} onActionSuccess={refresh} />
    </div>
  );
}
