import React, { useState } from 'react';
import {
  Play,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Clock,
  Cpu,
  Server,
  HardDrive,
  Globe,
  Trash2,
  FileText,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { executeCdnRequest, clearAllEdgeCaches } from '../services/api';

export default function RequestSimulator({ originFiles = [], onActionSuccess }) {
  // Available file selection
  const defaultFile = originFiles.length > 0 ? originFiles[0].name : 'sample.txt';
  const [selectedFile, setSelectedFile] = useState(defaultFile);

  // Routing algorithm selection: ROUND_ROBIN or LOWEST_LATENCY
  const [routingAlgorithm, setRoutingAlgorithm] = useState('ROUND_ROBIN');

  // Request execution state
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(null); // 'client' | 'router' | 'edge' | 'origin' | 'done'
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  const [requestHistory, setRequestHistory] = useState([]);
  const [showPayload, setShowPayload] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheClearNotice, setCacheClearNotice] = useState(null);

  // Fallback preset files if originFiles is empty or loading
  const presetFiles = [
    'sample.txt',
    'data.json',
    'dataset.json',
    'banner.svg',
    'large-payload.json',
    'styles.css'
  ];

  // Combined available files list
  const availableFiles = originFiles.length > 0
    ? originFiles.map(f => f.name)
    : presetFiles;

  /**
   * Send a single real CDN request through the actual backend
   */
  async function sendSingleRequest(filename = selectedFile, algorithm = routingAlgorithm) {
    setLoading(true);
    setError(null);
    setActiveStep('router');

    try {
      const result = await executeCdnRequest(filename, {
        strategy: algorithm
      });

      setActiveStep('done');
      setLastResult(result);

      // Append to session history (keep last 15 dispatches)
      setRequestHistory(prev => {
        const item = {
          ...result,
          sequence: prev.length + 1,
          dispatchedAt: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        return [item, ...prev].slice(0, 15);
      });

      if (onActionSuccess) {
        onActionSuccess();
      }

      return result;
    } catch (err) {
      setError(err.message || 'Request failed to reach CDN router');
      setActiveStep(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Send multiple sequential requests to the same file
   * Allows users to observe: 1st MISS -> subsequent HITs
   */
  async function sendMultipleRequests(count = 3) {
    setLoading(true);
    setError(null);

    try {
      for (let i = 0; i < count; i++) {
        await sendSingleRequest(selectedFile, routingAlgorithm);
        // Small 300ms pause between sequential requests to visualize step
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 350));
        }
      }
    } catch (err) {
      setError(err.message || 'Error executing multiple requests');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Clear cache on all edge servers to easily reset and reproduce Cache MISS
   */
  async function handleClearAllCaches() {
    setCacheClearing(true);
    setCacheClearNotice(null);
    try {
      await clearAllEdgeCaches();
      setCacheClearNotice('All 4 edge server caches cleared. Next request will be a cold Cache MISS.');
      if (onActionSuccess) onActionSuccess();
      setTimeout(() => setCacheClearNotice(null), 4500);
    } catch (err) {
      setError(`Failed to clear edge caches: ${err.message}`);
    } finally {
      setCacheClearing(false);
    }
  }

  // Calculate speedup factor if previous request was to the same file and had a MISS
  const speedupFactor = (() => {
    if (!lastResult || lastResult.cacheStatus !== 'HIT') return null;
    const prevMiss = requestHistory.find(
      r => r.filename === lastResult.filename && r.cacheStatus === 'MISS' && r.requestId !== lastResult.requestId
    );
    if (prevMiss && prevMiss.latencyMs > 0 && lastResult.latencyMs > 0) {
      const factor = (prevMiss.latencyMs / lastResult.latencyMs).toFixed(1);
      return parseFloat(factor) > 1.0 ? factor : null;
    }
    return null;
  })();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Header & Description                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Interactive Request Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch live client requests through the CDN Router (<code className="text-blue-600 font-mono">:9000</code>) to evaluate routing algorithms and observe edge cache behavior.
          </p>
        </div>

        {/* Quick purge caches button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearAllCaches}
            disabled={cacheClearing || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition disabled:opacity-50"
            title="Purge all 4 edge caches to test cold Cache MISS again"
          >
            {cacheClearing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Purge Edge Caches</span>
          </button>
        </div>
      </div>

      {/* Cache clear notification */}
      {cacheClearNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{cacheClearNotice}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Simulation Controls: File Selection & Routing Algorithm        */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
        {/* File Selection */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Select Available File</span>
          </label>
          <select
            value={selectedFile}
            onChange={e => setSelectedFile(e.target.value)}
            disabled={loading}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm disabled:bg-slate-100"
          >
            {availableFiles.map(file => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>

          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-slate-400">Presets:</span>
            {['sample.txt', 'data.json', 'banner.svg', 'large-payload.json'].map(file => (
              <button
                key={file}
                type="button"
                onClick={() => setSelectedFile(file)}
                disabled={loading}
                className={`text-[11px] px-2 py-0.5 rounded font-medium transition ${
                  selectedFile === file
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {file}
              </button>
            ))}
          </div>
        </div>

        {/* Routing Algorithm Selection */}
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span>Routing Algorithm</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRoutingAlgorithm('ROUND_ROBIN')}
              disabled={loading}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-left ${
                routingAlgorithm === 'ROUND_ROBIN'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="font-bold">Round Robin</div>
              <div className={`text-[10px] font-normal ${routingAlgorithm === 'ROUND_ROBIN' ? 'text-blue-100' : 'text-slate-400'}`}>
                Cycles across healthy edges
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRoutingAlgorithm('LOWEST_LATENCY')}
              disabled={loading}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-left ${
                routingAlgorithm === 'LOWEST_LATENCY'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="font-bold">Lowest Latency</div>
              <div className={`text-[10px] font-normal ${routingAlgorithm === 'LOWEST_LATENCY' ? 'text-blue-100' : 'text-slate-400'}`}>
                Fastest simulated edge
              </div>
            </button>
          </div>
        </div>

        {/* Dispatch Action Buttons */}
        <div className="md:col-span-3 space-y-1.5 flex flex-col justify-end">
          <label className="text-xs font-semibold text-slate-700">Actions</label>
          <div className="space-y-1.5">
            {/* Primary Send Button */}
            <button
              type="button"
              onClick={() => sendSingleRequest()}
              disabled={loading || !selectedFile}
              className="w-full h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Send Request</span>
                </>
              )}
            </button>

            {/* Send 3x Sequential Button for observing MISS then HIT */}
            <button
              type="button"
              onClick={() => sendMultipleRequests(3)}
              disabled={loading || !selectedFile}
              className="w-full h-8 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Sends 3 requests in sequence to observe the 1st Cache MISS followed by Cache HITs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Send 3x (Test MISS & HIT)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div>
            <span className="font-semibold">Request Failed: </span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Request Flow Visualization (Client -> Router -> Edge -> Origin) */}
      {/* ------------------------------------------------------------- */}
      {lastResult && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Request Flow Journey</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                lastResult.cacheStatus === 'HIT'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}>
                {lastResult.cacheStatus === 'HIT' ? '✓ Cache HIT (Origin Bypassed)' : '⚠ Cache MISS (Origin Contacted)'}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            lastResult.cacheStatus === 'HIT'
              ? 'bg-emerald-50/30 border-emerald-200'
              : 'bg-amber-50/30 border-amber-200'
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
              {/* Step 1: Client */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 1</span>
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="font-bold text-xs text-slate-900">Client / Browser</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Origin: 127.0.0.1</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-600">
                  Total Latency: <span className="font-bold text-slate-900">{lastResult.latencyMs} ms</span>
                </div>
              </div>

              {/* Step 2: CDN Router */}
              <div className="bg-white border border-blue-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 2</span>
                    <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="font-bold text-xs text-slate-900">CDN Router (:9000)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Strategy: <span className="font-semibold text-blue-700">{lastResult.strategy}</span>
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-600">
                  Target: <span className="font-semibold text-slate-900">{lastResult.selectedEdge}</span>
                </div>
              </div>

              {/* Step 3: Selected Edge */}
              <div className={`bg-white border rounded-lg p-3 shadow-xs flex flex-col justify-between ${
                lastResult.cacheStatus === 'HIT'
                  ? 'border-emerald-400 ring-1 ring-emerald-400/20'
                  : 'border-amber-400 ring-1 ring-amber-400/20'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      lastResult.cacheStatus === 'HIT' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      Step 3
                    </span>
                    <Server className={`w-3.5 h-3.5 ${
                      lastResult.cacheStatus === 'HIT' ? 'text-emerald-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {lastResult.selectedEdge || 'Selected Edge'}
                  </div>
                  <div className="mt-1">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      lastResult.cacheStatus === 'HIT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      CACHE {lastResult.cacheStatus}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-600">
                  Simulated: <span className="text-slate-900 font-semibold">{lastResult.simulatedLatency || '0ms'}</span>
                </div>
              </div>

              {/* Step 4: Origin Server (Only on Cache MISS) */}
              <div className={`rounded-lg p-3 shadow-xs flex flex-col justify-between transition-all ${
                lastResult.cacheStatus === 'MISS'
                  ? 'bg-white border border-amber-400 ring-1 ring-amber-400/20'
                  : 'bg-slate-100/60 border border-dashed border-slate-300 opacity-60'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      lastResult.cacheStatus === 'MISS' ? 'text-amber-700' : 'text-slate-400'
                    }`}>
                      Step 4 {lastResult.cacheStatus === 'MISS' ? '(Active)' : '(Bypassed)'}
                    </span>
                    <HardDrive className={`w-3.5 h-3.5 ${
                      lastResult.cacheStatus === 'MISS' ? 'text-amber-600' : 'text-slate-400'
                    }`} />
                  </div>
                  <div className={`font-bold text-xs ${
                    lastResult.cacheStatus === 'MISS' ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    Origin Server (:8000)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {lastResult.cacheStatus === 'MISS' ? 'Disk Storage Read' : 'Zero Origin Load'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-semibold">
                  {lastResult.cacheStatus === 'MISS' ? (
                    <span className="text-amber-700">Origin Contacted: YES</span>
                  ) : (
                    <span className="text-emerald-700">Origin Contacted: NO</span>
                  )}
                </div>
              </div>
            </div>

            {/* Narrative Explanation Footer */}
            <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900">Request Journey:</span>
                <span>
                  {lastResult.cacheStatus === 'HIT'
                    ? 'Client → CDN Router → Selected Edge (RAM Cache HIT) → Client'
                    : 'Client → CDN Router → Selected Edge (Cache MISS) → Origin Storage (:8000) → Selected Edge → Client'}
                </span>
              </div>
              {speedupFactor && (
                <div className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                  <span>⚡ Cache speedup: {speedupFactor}x faster than origin fetch!</span>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* Result Metadata: Display all 7 Required Fields               */}
          {/* ------------------------------------------------------------- */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Request Result Breakdown
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {/* 1. Request ID */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Request ID</span>
                <div className="font-mono text-xs font-bold text-slate-900 truncate mt-1" title={lastResult.requestId}>
                  {lastResult.requestId}
                </div>
              </div>

              {/* 2. Requested Filename */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Requested File</span>
                <div className="font-mono text-xs font-bold text-blue-600 truncate mt-1" title={lastResult.filename}>
                  {lastResult.filename}
                </div>
              </div>

              {/* 3. Selected Edge Server */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Selected Edge</span>
                <div className="text-xs font-bold text-slate-900 truncate mt-1" title={lastResult.selectedEdge}>
                  {lastResult.selectedEdge}
                </div>
              </div>

              {/* 4. Cache Status */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Cache Status</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                    lastResult.cacheStatus === 'HIT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {lastResult.cacheStatus}
                  </span>
                </div>
              </div>

              {/* 5. Response Latency */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Response Latency</span>
                <div className="text-xs font-bold text-slate-900 mt-1">
                  {lastResult.latencyMs} ms
                </div>
              </div>

              {/* 6. Origin Contacted */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Origin Contacted</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                    lastResult.originContacted === 'Yes'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {lastResult.originContacted}
                  </span>
                </div>
              </div>

              {/* 7. HTTP Status Code */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">HTTP Status</span>
                <div className="text-xs font-bold text-emerald-600 mt-1">
                  {lastResult.statusCode || lastResult.status} OK
                </div>
              </div>
            </div>
          </div>

          {/* Quick "Send Again" button to easily observe consecutive requests */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/60 border border-blue-200 rounded-lg p-3 text-xs">
            <div className="text-slate-700">
              <span className="font-semibold">Test consecutive caching: </span>
              <span>Send another request to <code className="font-mono text-blue-700 font-bold">{selectedFile}</code> to verify cache hit behavior.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => sendSingleRequest()}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs transition flex items-center gap-1 shadow-xs"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Send Again ({selectedFile})</span>
              </button>
            </div>
          </div>

          {/* Collapsible Content Payload & Headers Drawer */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPayload(!showPayload)}
              className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition"
            >
              <span>Payload & HTTP Response Headers</span>
              {showPayload ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {showPayload && (
              <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                {/* Headers Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-400 block text-[9px] uppercase">Content-Type</span>
                    <span className="text-slate-800 font-semibold">{lastResult.contentType}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-400 block text-[9px] uppercase">ETag</span>
                    <span className="text-slate-800 font-semibold truncate block">{lastResult.etag}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-400 block text-[9px] uppercase">X-Routing-Strategy</span>
                    <span className="text-blue-700 font-semibold">{lastResult.strategy}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-400 block text-[9px] uppercase">X-Origin-Contacted</span>
                    <span className={`font-semibold ${lastResult.originContacted === 'Yes' ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {lastResult.originContacted}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1">Body Preview:</span>
                  <pre className="text-xs font-mono bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto max-h-40 whitespace-pre-wrap">
                    {lastResult.body || '(Empty body)'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Session Dispatch History: Side-by-side Cache Miss vs Hit       */}
      {/* ------------------------------------------------------------- */}
      {requestHistory.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Session Requests Log ({requestHistory.length} dispatched)</span>
            </h4>
            <span className="text-[11px] text-slate-400">Notice first MISS followed by subsequent HITs</span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Request ID</th>
                    <th className="py-2 px-3">File</th>
                    <th className="py-2 px-3">Edge Node</th>
                    <th className="py-2 px-3">Cache Status</th>
                    <th className="py-2 px-3">Origin Contacted</th>
                    <th className="py-2 px-3 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {requestHistory.map((req, idx) => (
                    <tr key={`${req.requestId}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">#{req.sequence}</td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{req.dispatchedAt}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-700 truncate max-w-[140px]" title={req.requestId}>
                        {req.requestId}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-blue-600 font-semibold">{req.filename}</td>
                      <td className="py-2 px-3 text-slate-700">{req.selectedEdge}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.cacheStatus === 'HIT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.cacheStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`font-semibold ${
                          req.originContacted === 'Yes' ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {req.originContacted}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-900 font-bold">
                        {req.latencyMs} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
