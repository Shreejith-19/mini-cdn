import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Server,
  Zap,
  RefreshCw
} from 'lucide-react';
import RequestSimulator from '../components/RequestSimulator';

// Default initial items if no requests have been dispatched yet
const defaultRequests = [
  { id: 'req-17309102-01', time: '22:31:02', file: 'banner.svg', edge: 'Mumbai Edge', port: 8001, cache: 'HIT', latency: 12, status: 200, size: '3.6 KB' },
  { id: 'req-17309102-02', time: '22:30:58', file: 'data.json', edge: 'Singapore Edge', port: 8002, cache: 'HIT', latency: 18, status: 200, size: '191 B' },
  { id: 'req-17309102-03', time: '22:30:51', file: 'large-payload.json', edge: 'Frankfurt Edge', port: 8003, cache: 'MISS', latency: 154, status: 200, size: '2.1 KB' },
  { id: 'req-17309102-04', time: '22:30:45', file: 'sample.txt', edge: 'New York Edge', port: 8004, cache: 'HIT', latency: 24, status: 200, size: '190 B' },
  { id: 'req-17309102-05', time: '22:30:38', file: 'styles.css', edge: 'Mumbai Edge', port: 8001, cache: 'HIT', latency: 9, status: 304, size: '0 B' },
  { id: 'req-17309102-06', time: '22:30:30', file: 'dataset.json', edge: 'Singapore Edge', port: 8002, cache: 'MISS', latency: 88, status: 200, size: '897 B' },
  { id: 'req-17309102-07', time: '22:30:22', file: 'welcome.txt', edge: 'Frankfurt Edge', port: 8003, cache: 'HIT', latency: 16, status: 200, size: '775 B' },
  { id: 'req-17309102-08', time: '22:30:15', file: 'script.js', edge: 'New York Edge', port: 8004, cache: 'HIT', latency: 21, status: 200, size: '233 B' },
  { id: 'req-17309102-09', time: '22:30:04', file: 'sample.html', edge: 'Mumbai Edge', port: 8001, cache: 'HIT', latency: 10, status: 200, size: '603 B' },
  { id: 'req-17309102-10', time: '22:29:55', file: 'missing-asset.png', edge: 'Singapore Edge', port: 8002, cache: 'MISS', latency: 85, status: 404, size: '142 B' },
];

export default function RequestsPage() {
  const context = useOutletContext() || {};
  const { data, refresh } = context;

  const [searchTerm, setSearchTerm] = useState('');
  const [edgeFilter, setEdgeFilter] = useState('ALL');
  const [cacheFilter, setCacheFilter] = useState('ALL');

  // Pull actual live backend requests
  const liveRequests = data?.metrics?.requests;
  const originFiles = data?.origin?.files || [];

  const rawList = liveRequests && liveRequests.length > 0
    ? liveRequests.map(r => ({
        id: r.requestId || r.id,
        time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'now',
        file: r.requestedFilename || r.filename,
        edge: r.selectedEdge || 'None',
        cache: r.cacheStatus || 'UNKNOWN',
        latency: r.responseLatency ?? r.latencyMs ?? 0,
        status: r.httpStatusCode || r.statusCode || 200,
        size: r.bytes ? `${r.bytes} B` : '--'
      }))
    : defaultRequests;

  const filteredRequests = rawList.filter(req => {
    const file = req.file || '';
    const id = req.id || '';
    const matchesSearch = file.toLowerCase().includes(searchTerm.toLowerCase()) || id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEdge = edgeFilter === 'ALL' || req.edge.toLowerCase().includes(edgeFilter.toLowerCase());
    const matchesCache = cacheFilter === 'ALL' || req.cache === cacheFilter;
    return matchesSearch && matchesEdge && matchesCache;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Requests Activity Stream</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time audit log of all client traffic dispatched through the Mini CDN router and edge fleet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Stream</span>
          </button>
        </div>
      </div>

      {/* Interactive Traffic Dispatch Sandbox */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <RequestSimulator originFiles={originFiles} onActionSuccess={refresh} />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by filename or request ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Edge:</span>
            <select
              value={edgeFilter}
              onChange={e => setEdgeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 shadow-sm focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Edges (4 PoPs)</option>
              <option value="Mumbai">Mumbai (:8001)</option>
              <option value="Singapore">Singapore (:8002)</option>
              <option value="Frankfurt">Frankfurt (:8003)</option>
              <option value="New York">New York (:8004)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Cache:</span>
            <select
              value={cacheFilter}
              onChange={e => setCacheFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 shadow-sm focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="HIT">Cache HIT Only</option>
              <option value="MISS">Cache MISS Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Requested Asset</th>
                <th className="py-3 px-4">Edge Node</th>
                <th className="py-3 px-4">Cache State</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Payload</th>
                <th className="py-3 px-4">HTTP Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400 font-sans text-xs">
                    No requests matched the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-semibold">
                      {item.id}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {item.time}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.file}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-sans">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {item.edge}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        item.cache === 'HIT'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.cache}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      <span className={`inline-flex items-center gap-1 ${
                        item.latency < 50 ? 'text-emerald-600' : item.latency < 100 ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {item.latency} ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {item.size}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                        item.status === 200
                          ? 'text-emerald-700'
                          : item.status === 304
                          ? 'text-blue-700'
                          : 'text-rose-700'
                      }`}>
                        {item.status === 200 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredRequests.length} of {rawList.length} requests</span>
          <span className="text-[11px]">Live backend telemetry stream</span>
        </div>
      </div>
    </div>
  );
}
