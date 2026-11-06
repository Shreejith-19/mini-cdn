import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import OverviewPage from './pages/OverviewPage';
import RequestsPage from './pages/RequestsPage';
import EdgeServersPage from './pages/EdgeServersPage';
import CacheAnalyticsPage from './pages/CacheAnalyticsPage';
import PerformancePage from './pages/PerformancePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="overview" element={<Navigate to="/" replace />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="edges" element={<EdgeServersPage />} />
          <Route path="cache" element={<CacheAnalyticsPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
