import React from 'react';
import { Server, Globe, Zap, Cpu, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const sampleChartData = [
  { time: '00:00', originLatency: 160, edgeLatency: 12 },
  { time: '04:00', originLatency: 155, edgeLatency: 10 },
  { time: '08:00', originLatency: 180, edgeLatency: 14 },
  { time: '12:00', originLatency: 210, edgeLatency: 11 },
  { time: '16:00', originLatency: 175, edgeLatency: 13 },
  { time: '20:00', originLatency: 165, edgeLatency: 9 },
  { time: '24:00', originLatency: 150, edgeLatency: 10 },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Verification Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-sky-500/20 backdrop-blur">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Frontend Initialized Successfully
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Mini CDN Simulator Dashboard</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Vite, React, Tailwind CSS, React Router, Lucide Icons, and Recharts are configured and ready.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Verified Components */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">Vite + React</h3>
          <p className="text-xs text-slate-400 mt-1">Fast HMR and component rendering verified.</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">Tailwind CSS</h3>
          <p className="text-xs text-slate-400 mt-1">Utility-first styles and dark UI active.</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">Recharts Library</h3>
          <p className="text-xs text-slate-400 mt-1">Interactive latency charting verified.</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">Lucide React</h3>
          <p className="text-xs text-slate-400 mt-1">Clean SVG vector iconography loaded.</p>
        </div>
      </div>

      {/* Chart Verification Card */}
      <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Sample Verification Chart (Recharts)</h3>
            <p className="text-xs text-slate-400">Verifying chart compilation and rendering</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Origin Latency (~160ms)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Edge Latency (~10ms)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sampleChartData}>
              <defs>
                <linearGradient id="originGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} unit="ms" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="originLatency" stroke="#f59e0b" fillOpacity={1} fill="url(#originGrad)" name="Origin Latency" />
              <Area type="monotone" dataKey="edgeLatency" stroke="#38bdf8" fillOpacity={1} fill="url(#edgeGrad)" name="Edge Latency" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

