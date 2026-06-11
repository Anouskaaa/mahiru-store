'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { DashboardStats } from '@/types';

interface DashboardContextType {
  stats: DashboardStats | null;
  refreshStats: () => Promise<void>;
  loading: boolean;
}

const DashboardContext = createContext<DashboardContextType>({
  stats: null,
  refreshStats: async () => {},
  loading: false,
});

export function useDashboard() {
  return useContext(DashboardContext);
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshStats().then(() => setLoading(false));

    // Refresh stats every 5 minutes
    const interval = setInterval(refreshStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardContext.Provider value={{ stats, refreshStats, loading }}>
      {children}
    </DashboardContext.Provider>
  );
}
