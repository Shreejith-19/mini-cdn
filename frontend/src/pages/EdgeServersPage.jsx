import React, { useState } from 'react';
import {
  Server,
  Zap,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Cpu,
  RefreshCw,
  HardDrive
} from 'lucide-react';

const initialEdges = [
  {
    id: 'mumbai',
    name: 'Mumbai Edge',
    city: 'Mumbai',
    country: 'India',
    port: 8001,
    simulatedLatencyMs: 35,
    status: 'Running',
    health: 'Healthy',
    requests: '412,400',
    hits: '381,000',
    misses: '31,400',
    hitRatio: '92.4%',
    cachedObjects: 84,
    bytesServed: '1.42 GB',
    disabled: false
  },
  {
    id: 'singapore',
    name: 'Singapore Edge',
    city: 'Singapore',
    country: 'Singapore',
    port: 8002,
    simulatedLatencyMs: 80,
    status: 'Running',
    health: 'Healthy',
    requests: '385,200',
    hits: '343,200',
    misses: '42,000',
    hitRatio: '89.1%',
    cachedObjects: 76,
    bytesServed: '1.28 GB',
    disabled: false
  },
  {
    id: 'frankfurt',
    name: 'Frankfurt Edge',
    city: 'Frankfurt',
    country: 'Germany',
    port: 8003,
    simulatedLatencyMs: 150,
    status: 'Running',
    health: 'Healthy',
    requests: '320,800',
    hits: '278,400',
    misses: '42,400',
    hitRatio: '86.8%',
    cachedObjects: 68,
    bytesServed: '1.09 GB',
    disabled: false
  },
  {
    id: 'newyork',
    name: 'New York Edge',
    city: 'New York',
    country: 'United States',
    port: 8004,
    simulatedLatencyMs: 180,
    status: 'Running',
    health: 'Healthy',
    requests: '310,550',
    hits: '264,600',
    misses: '45,950',
    hitRatio: '85.2%',
    cachedObjects: 62,
    bytesServed: '1.03 GB',
    disabled: false
  }
];

export default function EdgeServersPage() {
  const [edges, setEdges] = useState(initialEdges);

  function toggleEdgeFailure(edgeId) {
    setEdges(prev =>
      prev.map(e => {
        if (e.id === edgeId) {
          const nextDisabled = !e.disabled;
          return {
            ...e,
            disabled: nextDisabled,
            status: nextDisabled ? 'Offline (Simulated)' : 'Running',
            health: nextDisabled ? 'Unhealthy' : 'Healthy'
          };
        }
        return e;
      })
    );
  }

  function clearCache(edgeId) {
    setEdges(prev =>
      prev.map(e => (e.id === edgeId ? { ...e, cachedObjects: 0 } : e))
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Edge Servers Infrastructure</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            4 independent Points of Presence (PoPs) with autonomous in-memory LRU caches and failure isolation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            All 4 Nodes Operational
          </span>
        </div>
      </div>

      {/* Edge Fleet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {edges.map(edge => (
          <div
            key={edge.id}
            className={`bg-white border rounded-xl p-5 shadow-sm space-y-4 transition-all ${
              edge.disabled ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Top Node Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  edge.disabled
                    ? 'bg-rose-100 text-rose-600 border border-rose-200'
                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{edge.name}</h3>
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                      :{edge.port}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{edge.city}, {edge.country}</span>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                edge.disabled
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${edge.disabled ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                {edge.status}
              </span>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50/80 rounded-lg border border-slate-100 text-center">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Config Latency</span>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{edge.simulatedLatencyMs} ms</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hit Ratio</span>
                <div className="text-sm font-bold text-blue-600 mt-0.5">{edge.hitRatio}</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bytes Served</span>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{edge.bytesServed}</div>
              </div>
            </div>

            {/* In-Memory LRU Cache Usage Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  In-Memory LRU Cache (Capacity: 100)
                </span>
                <span className="font-semibold text-slate-700">{edge.cachedObjects} / 100 objects</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${edge.cachedObjects}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>TTL: 60s</span>
                <span>Hits: {edge.hits} &bull; Misses: {edge.misses}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleEdgeFailure(edge.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium border transition ${
                    edge.disabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
                      : 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200'
                  }`}
                >
                  {edge.disabled ? 'Restore Edge' : 'Simulate Offline'}
                </button>

                <button
                  type="button"
                  onClick={() => clearCache(edge.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium transition"
                  title="Flush Edge LRU Cache"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <a
                href={`http://localhost:${edge.port}/`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium transition"
              >
                <span>Diagnostics</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

