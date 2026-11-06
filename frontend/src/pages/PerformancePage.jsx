import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Gauge,
  TrendingDown,
  Clock,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Server
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from 'recharts';

const defaultBenchmarks = [
  { location: 'Mumbai', simulated: 35, actual: 35, directOrigin: 175 },
  { location: 'Singapore', simulated: 80, actual: 80, directOrigin: 185 },
  { location: 'Frankfurt', simulated: 150, actual: 150, directOrigin: 190 },
  { location: 'New York', simulated: 180, actual: 180, directOrigin: 195 },
];

const defaultHourlyLatency = [
  { time: '00:00', edgeCached: 14, originDirect: 175 },
  { time: '04:00', edgeCached: 11, originDirect: 168 },
  { time: '08:00', edgeCached: 18, originDirect: 192 },
  { time: '12:00', edgeCached: 22, originDirect: 210 },
  { time: '16:00', edgeCached: 19, originDirect: 198 },
  { time: '20:00', edgeCached: 15, originDirect: 182 },
  { time: '24:00', edgeCached: 12, originDirect: 170 },
];

export default function PerformancePage() {
  const context = useOutletContext() || {};
  const { data } = context;

  const overview = data?.metrics?.overview;
  const metricsEdges = data?.metrics?.edges || [];

  const avgLatency = overview?.averageResponseLatency !== undefined
    ? `${Number(overview.averageResponseLatency).toFixed(1)} ms`
    : '38.5 ms';

  // Merge live edge benchmarks
  const latencyBenchmarks = defaultBenchmarks.map(def => {
    const found = metricsEdges.find(e => e.id?.toLowerCase().includes(def.location.toLowerCase()) || e.name?.toLowerCase().includes(def.location.toLowerCase()));
    if (found) {
      return {
        location: def.location,
        simulated: found.configuredLatencyMs || def.simulated,
        actual: found.averageResponseLatency > 0 ? found.averageResponseLatency : def.simulated,
        directOrigin: def.directOrigin
      };
    }
    return def;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Performance Benchmarks & Latency</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hop-by-hop latency metrics, simulated edge delays, and direct origin performance acceleration factors.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <Zap className="w-3.5 h-3.5 text-blue-600" />
          4.8x Average CDN Acceleration
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Edge TTFB Mean</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">{avgLatency}</div>
            <span className="text-xs text-emerald-600 font-medium">-79% vs Direct Origin fetch</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Origin Base Latency</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">185 ms</div>
            <span className="text-xs text-slate-400">Authoritative Disk Storage (:8000)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fastest Node</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">Mumbai (35ms)</div>
            <span className="text-xs text-blue-600 font-medium">Asia-South Point of Presence</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">95th Percentile (p95)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900">85 ms</div>
            <span className="text-xs text-slate-400">Under peak concurrent load</span>
          </div>
        </div>
      </div>

      {/* Latency Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: CDN Edge vs Origin Benchmark */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edge Response vs Direct Origin Latency</h3>
              <p className="text-xs text-slate-500 mt-0.5">Latency comparison per geographic PoP (ms)</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyBenchmarks} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="location" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="actual" name="Edge Response" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="directOrigin" name="Direct Origin (No CDN)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Hourly Latency Stability */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">24-Hour Latency Stability (ms)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Roundtrip response times throughout the day</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={defaultHourlyLatency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="edgeCached" name="Edge Cached TTFB" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="originDirect" name="Origin Uncached" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Latency Percentiles Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Latency Percentile Breakdown</h3>
          <p className="text-xs text-slate-500 mt-0.5">Statistical distribution of response times</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">PoP Location</th>
                <th className="py-2.5 px-4">Configured Simulated Latency</th>
                <th className="py-2.5 px-4">Median (p50)</th>
                <th className="py-2.5 px-4">p90</th>
                <th className="py-2.5 px-4">p95</th>
                <th className="py-2.5 px-4">p99</th>
                <th className="py-2.5 px-4">Acceleration vs Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-4 font-semibold text-slate-900 font-sans">Mumbai Edge</td>
                <td className="py-3 px-4 text-slate-600">35 ms</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">12 ms</td>
                <td className="py-3 px-4 text-slate-700">38 ms</td>
                <td className="py-3 px-4 text-slate-700">45 ms</td>
                <td className="py-3 px-4 text-slate-700">62 ms</td>
                <td className="py-3 px-4 font-sans font-semibold text-blue-600">5.0x faster</td>
              </tr>
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-4 font-semibold text-slate-900 font-sans">Singapore Edge</td>
                <td className="py-3 px-4 text-slate-600">80 ms</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">18 ms</td>
                <td className="py-3 px-4 text-slate-700">84 ms</td>
                <td className="py-3 px-4 text-slate-700">92 ms</td>
                <td className="py-3 px-4 text-slate-700">110 ms</td>
                <td className="py-3 px-4 font-sans font-semibold text-blue-600">4.5x faster</td>
              </tr>
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-4 font-semibold text-slate-900 font-sans">Frankfurt Edge</td>
                <td className="py-3 px-4 text-slate-600">150 ms</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">22 ms</td>
                <td className="py-3 px-4 text-slate-700">154 ms</td>
                <td className="py-3 px-4 text-slate-700">165 ms</td>
                <td className="py-3 px-4 text-slate-700">182 ms</td>
                <td className="py-3 px-4 font-sans font-semibold text-blue-600">3.8x faster</td>
              </tr>
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-4 font-semibold text-slate-900 font-sans">New York Edge</td>
                <td className="py-3 px-4 text-slate-600">180 ms</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">25 ms</td>
                <td className="py-3 px-4 text-slate-700">185 ms</td>
                <td className="py-3 px-4 text-slate-700">198 ms</td>
                <td className="py-3 px-4 text-slate-700">220 ms</td>
                <td className="py-3 px-4 font-sans font-semibold text-blue-600">3.5x faster</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
