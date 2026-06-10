import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AppData } from '../types';

const emptyData = (): AppData => ({
  properties: [],
  sellers: [],
  buyers: [],
  investors: [],
});

export function useStore() {
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.fetchData();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data from API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const replaceData = (next: AppData) => setData(next);

  return { data, setData: replaceData, refresh, loading, error };
}