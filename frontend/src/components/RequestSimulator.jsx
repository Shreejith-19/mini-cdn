import React, { useState } from 'react';
import { Play, Zap, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Layers, Clock, Cpu } from 'lucide-react';
import { executeCdnRequest, executeDirectEdgeRequest } from '../services/api';

export default function RequestSimulator({ originFiles = [], onActionSuccess }) {
  const [selectedFile, setSelectedFile] = useState(originFiles[0]?.name || 'sample.txt');
  const [targetMode, setTargetMode] = useState('router'); // 'router' or port number '8001', etc.
  const [burstCount, setBurstCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [burstResults, setBurstResults] = useState([]);
  const [error, setError] = useState(null);

  // Suggested preset files
  const presetFiles = ['sample.txt', 'data.json', 'banner.svg', 'large-payload.json'];

  async function handleSendRequest() {
    setLoading(true);
    setError(null);
    setBurstResults([]);

    try {
      if (burstCount === 1) {
        let result;
        if (targetMode === 'router') {
          result = await executeCdnRequest(selectedFile);
        } else {
          result = await executeDirectEdgeRequest(parseInt(targetMode, 10), selectedFile);
        }
        setLastResult(result);
      } else {
        // Run burst requests sequentially to observe Round Robin in action
        const results = [];
        for (let i = 0; i < burstCount; i++) {
          let res;
          if (targetMode === 'router') {
            res = await executeCdnRequest(selectedFile);
          } else {
            res = await executeDirectEdgeRequest(parseInt(targetMode, 10), selectedFile);
          }
          results.push({ ...res, burstIndex: i + 1 });
        }
        setBurstResults(results);
        setLastResult(results[results.length - 1]);
      }

      if (onActionSuccess) {
        onActionSuccess();
      }
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Interactive CDN Traffic Simulator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Send real-time client requests through the CDN Router (:9000) or directly to Edge PoPs to test caching & routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Burst Mode:</span>
          {[1, 4, 8].map(count => (
            <button
              key={count}
              type="button"
              onClick={() => setBurstCount(count)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                burstCount === count
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50'
              }`}
            >
              {count}x
            </button>
          ))}
        </div>
      </div>

      {/* Controls Form */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Target File */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Target Content Asset</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={selectedFile}
              onChange={e => setSelectedFile(e.target.value)}
              placeholder="e.g. sample.txt"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-slate-500">Presets:</span>
            {presetFiles.map(file => (
              <button
                key={file}
                type="button"
                onClick={() => setSelectedFile(file)}
                className={`text-[11px] px-2 py-0.5 rounded transition ${
                  selectedFile === file
                    ? 'bg-sky-500/30 text-sky-200 border border-sky-500/50'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                {file}
              </button>
            ))}
          </div>
        </div>

        {/* Route Gateway / Target */}
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Routing Destination</label>
          <select
            value={targetMode}
            onChange={e => setTargetMode(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="router">Central CDN Router (:9000) [Intelligent Routing]</option>
            <option value="8001">Direct: Mumbai Edge (:8001 - 35ms)</option>
            <option value="8002">Direct: Singapore Edge (:8002 - 80ms)</option>
            <option value="8003">Direct: Frankfurt Edge (:8003 - 150ms)</option>
            <option value="8004">Direct: New York Edge (:8004 - 180ms)</option>
          </select>
        </div>

        {/* Action Button */}
        <div className="md:col-span-3">
          <button
            type="button"
            onClick={handleSendRequest}
            disabled={loading || !selectedFile}
            className="w-full h-[38px] bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute {burstCount > 1 ? `${burstCount} Requests` : 'Request'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Simulation Error: {error}</span>
        </div>
      )}

      {/* Hop-by-hop Visual Flow and Result Inspector */}
      {lastResult && (
        <div className="space-y-4 pt-2">
          {/* Visual Hop Flow */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Live Request Flow Breakdown
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              {/* Client Box */}
              <div className="flex-1 w-full bg-slate-900 border border-slate-700/70 rounded-lg p-2.5 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Originator</span>
                <p className="font-semibold text-white mt-0.5">Browser Client</p>
                <span className="text-[10px] text-slate-400">Total: {lastResult.clientDurationMs || lastResult.durationMs}ms</span>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 hidden sm:block" />

              {/* Router Box (if routed) */}
              {targetMode === 'router' && (
                <>
                  <div className="flex-1 w-full bg-slate-900 border border-sky-500/30 rounded-lg p-2.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">CDN Router (:9000)</span>
                    <p className="font-semibold text-sky-200 mt-0.5">{lastResult.strategy || 'Round Robin'}</p>
                    <span className="text-[10px] text-sky-400/80">Decision Engine</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 hidden sm:block" />
                </>
              )}

              {/* Edge Node Box */}
              <div className={`flex-1 w-full bg-slate-900 border rounded-lg p-2.5 text-center ${
                lastResult.cacheStatus === 'HIT' ? 'border-emerald-500/40' : 'border-amber-500/40'
              }`}>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Edge: {lastResult.selectedEdge || lastResult.cacheEdge || 'Edge Node'}
                </span>
                <div className="mt-0.5 flex items-center justify-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    lastResult.cacheStatus === 'HIT'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    CACHE {lastResult.cacheStatus}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Sim: {lastResult.simulatedLatency || '0ms'}</span>
              </div>

              {/* Origin Server Box (Active only on Cache MISS) */}
              {lastResult.cacheStatus === 'MISS' && (
                <>
                  <ArrowRight className="w-4 h-4 text-amber-500/60 shrink-0 hidden sm:block animate-pulse" />
                  <div className="flex-1 w-full bg-slate-900 border border-amber-500/40 rounded-lg p-2.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Origin Server (:8000)</span>
                    <p className="font-semibold text-amber-300 mt-0.5">Authoritative Fetch</p>
                    <span className="text-[10px] text-amber-400/80">Read Disk Storage</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Response Metadata & Payload Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Headers & Stats */}
            <div className="lg:col-span-1 bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Response Headers</span>
              
              <div className="space-y-1.5 text-slate-300">
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-semibold text-emerald-400">{lastResult.status} OK</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-500">X-Cache:</span>
                  <span className={`font-semibold ${lastResult.cacheStatus === 'HIT' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {lastResult.cacheStatus}
                  </span>
                </div>
                {lastResult.selectedEdge && (
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-500">X-Selected-Edge:</span>
                    <span className="text-sky-300">{lastResult.selectedEdge}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-500">Simulated Latency:</span>
                  <span className="text-slate-200">{lastResult.simulatedLatency || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-500">Content-Type:</span>
                  <span className="text-slate-300 truncate max-w-[120px]">{lastResult.contentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ETag:</span>
                  <span className="text-slate-400 font-mono text-[10px] truncate max-w-[120px]">{lastResult.etag}</span>
                </div>
              </div>
            </div>

            {/* Content Payload Preview */}
            <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    Content Preview ({lastResult.filename || selectedFile})
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">{lastResult.contentType}</span>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/90 border border-slate-800 p-2.5 rounded-md overflow-x-auto max-h-36 whitespace-pre-wrap">
                  {lastResult.body || '(Empty response body)'}
                </pre>
              </div>
            </div>
          </div>

          {/* Burst Multi-Request Grid (if burstCount > 1) */}
          {burstResults.length > 1 && (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Burst Dispatch Sequence ({burstResults.length} requests)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                {burstResults.map(r => (
                  <div key={r.burstIndex} className="bg-slate-900 border border-slate-800 rounded p-2 text-center text-[10px]">
                    <div className="text-slate-500 font-bold">Req #{r.burstIndex}</div>
                    <div className="text-sky-300 font-semibold truncate mt-0.5">{r.selectedEdge?.split(' ')[0] || `:${r.port}`}</div>
                    <div className={`mt-1 font-bold ${r.cacheStatus === 'HIT' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {r.cacheStatus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

