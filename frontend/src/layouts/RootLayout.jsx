import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Globe, Server, Activity, Layers } from 'lucide-react';

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-wide">Mini CDN Simulator</h1>
              <p className="text-xs text-slate-400">Edge Caching & Intelligent Routing</p>
            </div>
          </div>

          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              to="/"
              className="px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
            >
              Dashboard
            </Link>
            <a
              href="http://localhost:8000/health"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Backend Health
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        Mini CDN Simulator &copy; 2026 &mdash; Pure Node.js & React Architecture
      </footer>
    </div>
  );
}

