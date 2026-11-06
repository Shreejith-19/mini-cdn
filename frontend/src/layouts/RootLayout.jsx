import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useCdnData } from '../hooks/useCdnData';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Server,
  Database,
  BarChart2,
  Settings,
  Globe,
  Calendar,
  Activity,
  Menu,
  X,
  ChevronDown,
  Layers,
  Zap,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export default function RootLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dateRange, setDateRange] = useState('24h');
  const location = useLocation();
  const { data, loading, error, refresh, autoRefresh, setAutoRefresh } = useCdnData(3000);

  // Navigation items matching specification
  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Requests', path: '/requests', icon: ArrowLeftRight },
    { name: 'Edge Servers', path: '/edges', icon: Server },
    { name: 'Cache Analytics', path: '/cache', icon: Database },
    { name: 'Performance', path: '/performance', icon: BarChart2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Helper to determine current page title based on path
  function getPageTitle() {
    const current = navItems.find(item => {
      if (item.path === '/') return location.pathname === '/';
      return location.pathname.startsWith(item.path);
    });
    return current ? current.name : 'Dashboard';
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans antialiased">
      {/* ======================================================== */}
      {/* 1. Dark Navy Vertical Sidebar                            */}
      {/* ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0f172a] text-slate-300 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight leading-tight block">
                Mini CDN
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                Edge Delivery Platform
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation Links */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Monitoring & Analytics
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer: Fleet Summary */}
        <div className="p-4 border-t border-slate-800 bg-[#090d16]/50 shrink-0 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Global Fleet</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              4 PoPs Online
            </span>
          </div>

          <div className="bg-slate-800/80 rounded-lg p-2.5 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Routing Mode</span>
              <span className="text-slate-200 font-semibold">Round Robin</span>
            </div>
            <div className="flex justify-between">
              <span>Origin Server</span>
              <span className="text-slate-200 font-mono text-[10px]">:8000</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ======================================================== */}
      {/* 2. Main Area (Header + Scrollable Main Content)          */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
          {/* Left: Mobile hamburger + Page Title + Project info */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900 p-1.5 rounded-lg border border-slate-200"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current Page Title */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  {getPageTitle()}
                </h1>
                <span className="hidden sm:inline-block text-slate-300">|</span>
                <span className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-500">
                  Mini CDN
                </span>
              </div>
            </div>

            {/* Environment Status Badge */}
            <div className="hidden sm:flex items-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Environment: Running
              </span>
            </div>
          </div>

          {/* Right: Date-range selector & quick links */}
          <div className="flex items-center gap-3">
            {/* Date-range selector */}
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                className="pl-8 pr-8 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="1h">Last 1 hour</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Live Refresh Button */}
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-50 transition"
              title="Manual Data Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Backend Health Diagnostics link */}
            <a
              href="http://localhost:9000/router"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span>Router (:9000)</span>
            </a>
          </div>
        </header>

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-800">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet context={{ data, loading, error, refresh, autoRefresh, setAutoRefresh }} />
          </div>
        </main>
      </div>
    </div>
  );
}
