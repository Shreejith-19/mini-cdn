import React, { useState } from 'react';
import { History, ShieldCheck, Zap, Clock, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DecisionsLog({ requests = [], decisions = [] }) {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'decisions'

  function formatTime(isoString) {
    if (!isoString) return '--:--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  }

  function getLatencyBadgeClass(ms) {
    if (ms < 50) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (ms < 120) return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    if (ms < 200) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  }

  const items = activeTab === 'requests' ? requests : decisions;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Header and Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-sky-400" />
          <h3 className="text-base font-semibold text-white">Live Request & Routing Audit Stream</h3>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeTab === 'requests'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Metrics History ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decisions')}
            className={`px-3 py-1 rounded font-medium transition ${
              activeTab === 'decisions'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Router Decisions ({decisions.length})
          </button>
        </div>
      </div>

      {/* Stream Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Request ID</th>
              <th className="py-2.5 px-3">Target Asset</th>
              <th className="py-2.5 px-3">Selected Edge</th>
              <th className="py-2.5 px-3">Cache Status</th>
              <th className="py-2.5 px-3">Latency</th>
              <th className="py-2.5 px-3">HTTP Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {items.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-slate-500 font-sans text-xs">
                  No requests recorded yet. Send a simulated request above to inspect real-time metrics telemetry.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const id = item.requestId || item.id || `req-${idx}`;
                const file = item.requestedFilename || item.filename || item.file || 'unknown';
                const edge = item.selectedEdge || 'None';
                const cache = item.cacheStatus || 'UNKNOWN';
                const latency = item.responseLatency ?? item.latencyMs ?? item.actualDurationMs ?? 0;
                const status = item.httpStatusCode || item.statusCode || item.status || 200;
                const time = item.timestamp;

                return (
                  <tr key={id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatTime(time)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[10px] truncate max-w-[110px]" title={id}>
                      {id}
                    </td>
                    <td className="py-2.5 px-3 text-sky-300 font-semibold truncate max-w-[140px]">
                      {file}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                        {edge}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        cache === 'HIT'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : cache === 'MISS'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {cache}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${getLatencyBadgeClass(latency)}`}>
                        <Clock className="w-3 h-3" />
                        {latency} ms
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        status >= 200 && status < 300
                          ? 'text-emerald-400'
                          : status === 304
                          ? 'text-cyan-400'
                          : 'text-rose-400'
                      }`}>
                        {status >= 400 ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
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
  );
}

