// src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// ============================================================
// QUERY CLIENT CONFIG
// ============================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep cached data for 1 year (matches token expiry)
      gcTime: 1000 * 60 * 60 * 24 * 365,

      // Consider data fresh for 5 minutes (avoids refetch on tab switch)
      staleTime: 1000 * 60 * 5,

      // Retry policy:
      //   - 401 / 403             → no retry (auth problem, retry won't help)
      //   - 5xx / ECONNREFUSED    → no retry (DB or server down, retry spams)
      //   - anything else         → 1 retry (transient network blip)
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) return false;
        if (status >= 500) return false;
        if (error?.code === 'ECONNREFUSED') return false;
        return failureCount < 1;
      },

      // Offline-first: serve cache when offline, don't spam network
      networkMode: 'offlineFirst',

      // Refetch when app comes back online
      refetchOnReconnect: true,

      // Don't refetch just because window regained focus
      refetchOnWindowFocus: false,

      // Keep the last successful data object stable across refetches
      // when the shape hasn't changed. Default is already true — this
      // line makes the intent explicit so future readers don't disable
      // it by accident (structural-sharing=true is what prevents the
      // cache from being wiped on a bad refetch when shape is identical).
      structuralSharing: true,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// ============================================================
// PERSISTENCE (offline cache to localStorage)
// ============================================================
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'CBE_QUERY_CACHE',
  throttleTime: 1000,
});

// Persist only successful queries (never errors)
persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Only persist queries that succeeded
      return query.state.status === 'success';
    },
  },
});

export default queryClient;