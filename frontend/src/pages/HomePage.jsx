import React from 'react';
import { RefreshCw, Radio, Server, Activity, Globe } from 'lucide-react';
import { useCdnData } from '../hooks/useCdnData';
import MetricsOverview from '../components/MetricsOverview';
import NetworkControlCards from '../components/NetworkControlCards';
import RequestSimulator from '../components/RequestSimulator';
import EdgeNodesGrid from '../components/EdgeNodesGrid';
import PerformanceCharts from '../charts/PerformanceCharts';
import DecisionsLog from '../components/DecisionsLog';

export default function HomePage() {
  const { data, loading, error, refresh, autoRefresh, setAutoRefresh } = useCdnData(3000);

  const origin = data?.origin;
  const router = data?.router;
  const edges = data?.edges || [];
  const metrics = data?.metrics || {};
  const originFiles = origin?.files || [];
  const routerDecisions = router?.decisions || [];
  const metricsRequests = metrics.requests || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Dashboard Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-sky-500/20 backdrop-blur">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              CDN Telemetry Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Mini CDN Simulator Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time edge caching, intelligent routing algorithms, hop latency analysis & failure simulation.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
            />
            <span>Auto Refresh (3s)</span>
          </label>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Real-time Metrics Overview */}
      <MetricsOverview data={data} />

      {/* Interactive CDN Traffic Simulator */}
      <RequestSimulator originFiles={originFiles} onActionSuccess={refresh} />

      {/* Central Network Controls: CDN Router & Origin Server */}
      <NetworkControlCards origin={origin} router={router} onActionSuccess={refresh} />

      {/* 4 Independent Edge Nodes (Mumbai, Singapore, Frankfurt, New York) */}
      <EdgeNodesGrid edges={router?.edges || []} onActionSuccess={refresh} />

      {/* Latency & Cache Analytics Charts */}
      <PerformanceCharts edges={router?.edges || []} metrics={metrics} />

      {/* Live Request Stream & Routing Decision Audit Log */}
      <DecisionsLog requests={metricsRequests} decisions={routerDecisions} />
    </div>
  );
}
