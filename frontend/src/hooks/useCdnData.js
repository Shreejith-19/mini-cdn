import { useState, useEffect, useCallback } from 'react';
import { fetchFullNetworkSnapshot } from '../services/api';

export function useCdnData(intervalMs = 3000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await fetchFullNetworkSnapshot();
      setData(snapshot);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    if (!autoRefresh) return;
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, autoRefresh, intervalMs]);

  return {
    data,
    loading,
    error,
    refresh,
    autoRefresh,
    setAutoRefresh
  };
}
