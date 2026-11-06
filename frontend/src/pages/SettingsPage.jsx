import React, { useState } from 'react';
import {
  Settings,
  Compass,
  Sliders,
  Database,
  Trash2,
  Server,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  Globe
} from 'lucide-react';

export default function SettingsPage() {
  const [strategy, setStrategy] = useState('ROUND_ROBIN');
  const [cacheTtl, setCacheTtl] = useState(60);
  const [cacheCapacity, setCacheCapacity] = useState(100);
  const [healthInterval, setHealthInterval] = useState(5);
  const [savedNotice, setSavedNotice] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System & Routing Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure CDN routing algorithms, in-memory cache TTL expiration, and health probe intervals.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configuration saved successfully. Active routing rules have been applied.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Routing Strategy */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Compass className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Traffic Routing Strategy</h3>
          </div>

          <div className="space-y-3">
            <label className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
              strategy === 'ROUND_ROBIN'
                ? 'border-blue-500 bg-blue-50/30'
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="strategy"
                value="ROUND_ROBIN"
                checked={strategy === 'ROUND_ROBIN'}
                onChange={() => setStrategy('ROUND_ROBIN')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Round Robin (Sequential Distribution)</span>
                <span className="text-slate-500 mt-0.5 block">
                  Distributes client traffic evenly across all healthy edges in sequential cyclic order (Mumbai &rarr; Singapore &rarr; Frankfurt &rarr; New York).
                </span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
              strategy === 'LOWEST_LATENCY'
                ? 'border-blue-500 bg-blue-50/30'
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="strategy"
                value="LOWEST_LATENCY"
                checked={strategy === 'LOWEST_LATENCY'}
                onChange={() => setStrategy('LOWEST_LATENCY')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Lowest Simulated Latency (Proximity Routing)</span>
                <span className="text-slate-500 mt-0.5 block">
                  Selects the healthy edge node with the lowest configured latency (Mumbai: 35ms &rarr; Singapore: 80ms &rarr; Frankfurt: 150ms &rarr; New York: 180ms).
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Card 2: Cache Parameters */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Edge In-Memory LRU Cache Configuration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Default Time-To-Live (TTL)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="3600"
                  value={cacheTtl}
                  onChange={e => setCacheTtl(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
                <span className="text-slate-500 font-medium">seconds</span>
              </div>
              <p className="text-[11px] text-slate-400">Duration cached objects remain fresh before origin revalidation.</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Cache Maximum Capacity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={cacheCapacity}
                  onChange={e => setCacheCapacity(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
                <span className="text-slate-500 font-medium">objects</span>
              </div>
              <p className="text-[11px] text-slate-400">Maximum entries per node before LRU eviction triggers.</p>
            </div>
          </div>
        </div>

        {/* Card 3: Port Mappings */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Server className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Infrastructure Port Allocations</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">CDN Router</div>
              <div className="font-semibold text-slate-900 mt-1">:9000</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Origin Server</div>
              <div className="font-semibold text-slate-900 mt-1">:8000</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Mumbai Edge</div>
              <div className="font-semibold text-slate-900 mt-1">:8001 (35ms)</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Singapore Edge</div>
              <div className="font-semibold text-slate-900 mt-1">:8002 (80ms)</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Frankfurt Edge</div>
              <div className="font-semibold text-slate-900 mt-1">:8003 (150ms)</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">New York Edge</div>
              <div className="font-semibold text-slate-900 mt-1">:8004 (180ms)</div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}

