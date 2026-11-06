import React from 'react';
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
import { BarChart3, PieChart as PieIcon, Zap } from 'lucide-react';

const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#f59e0b', '#ec4899'];

export default function PerformanceCharts({ edges = [], metrics = {} }) {
  const edgeMetrics = metrics.edges && metrics.edges.length > 0 ? metrics.edges : edges;
  const bandwidthData = metrics.bandwidth?.edges || [];

  // Data for Chart 1: Latency Benchmark
  const latencyData = [
    { name: 'Mumbai', configured: 35, actual: 0 },
    { name: 'Singapore', configured: 80, actual: 0 },
    { name: 'Frankfurt', configured: 150, actual: 0 },
    { name: 'New York', configured: 180, actual: 0 }
  ];

  edgeMetrics.forEach(em => {
    const key = (em.name || '').split(' ')[0];
    const match = latencyData.find(d => d.name.toLowerCase() === key.toLowerCase());
    if (match) {
      match.actual = em.averageResponseLatency || em.averageLatencyMs || 0;
      if (em.configuredLatencyMs) match.configured = em.configuredLatencyMs;
    }
  });

  // Data for Chart 2: Cache Hits vs Misses
  const cacheData = edgeMetrics.map(em => ({
    name: (em.name || 'Edge').replace(' Edge', ''),
    hits: em.cacheHits || 0,
    misses: em.cacheMisses || 0,
    hitRatio: em.cacheHitRatio || 0
  }));

  // Data for Chart 3: Bandwidth Distribution
  const pieData = bandwidthData
    .filter(b => (b.bytesServed || 0) > 0)
    .map(b => ({
      name: (b.name || 'Edge').replace(' Edge', ''),
      value: b.bytesServed
    }));

  const hasPieData = pieData.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1: Latency Benchmark */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h4 className="text-sm font-semibold text-white">Edge Latency Comparison</h4>
          </div>
          <span className="text-[11px] text-slate-400">Configured vs Actual (ms)</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit="ms" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="configured" name="Simulated Latency" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="Actual Duration" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Cache Hits vs Misses */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-white">Edge Cache Hits & Misses</h4>
          </div>
          <span className="text-[11px] text-slate-400">Cache Performance</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cacheData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="hits" name="Cache Hits" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="misses" name="Cache Misses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

