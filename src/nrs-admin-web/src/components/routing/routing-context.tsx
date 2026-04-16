'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { pacsDestinationApi, routingZoneApi, routeQueueApi } from '@/lib/api';
import type { PacsDestination, RoutingZone, QueueSummaryResponse } from '@/lib/types';

export type RoutingSectionId = 'dashboard' | 'destinations' | 'zones' | 'queue' | 'errors';

export interface NavigationFilter {
  destinationId?: number;
  subTab?: 'errors' | 'history';
}

interface RoutingContextValue {
  // Shared data
  destinations: PacsDestination[];
  zones: RoutingZone[];
  summary: QueueSummaryResponse | null;
  summaryLoading: boolean;
  initialLoading: boolean;

  // Reload functions
  reloadDestinations: () => Promise<void>;
  reloadZones: () => Promise<void>;
  reloadSummary: () => Promise<void>;
  reloadAll: () => Promise<void>;

  // Section navigation
  activeSection: RoutingSectionId;
  navigateTo: (section: RoutingSectionId, filter?: NavigationFilter) => void;
  pendingFilter: NavigationFilter | null;
  consumeFilter: () => void;
}

const RoutingContext = createContext<RoutingContextValue | null>(null);

export function useRoutingContext() {
  const ctx = useContext(RoutingContext);
  if (!ctx) throw new Error('useRoutingContext must be used within RoutingProvider');
  return ctx;
}

export function RoutingProvider({ children }: { children: ReactNode }) {
  const [destinations, setDestinations] = useState<PacsDestination[]>([]);
  const [zones, setZones] = useState<RoutingZone[]>([]);
  const [summary, setSummary] = useState<QueueSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [activeSection, setActiveSection] = useState<RoutingSectionId>('dashboard');
  const [pendingFilter, setPendingFilter] = useState<NavigationFilter | null>(null);

  const reloadDestinations = useCallback(async () => {
    try {
      const res = await pacsDestinationApi.getAll();
      if (res.success && res.data) setDestinations(res.data);
    } catch { /* silent */ }
  }, []);

  const reloadZones = useCallback(async () => {
    try {
      const res = await routingZoneApi.getAll();
      if (res.success && res.data) setZones(res.data);
    } catch { /* silent */ }
  }, []);

  const reloadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await routeQueueApi.getSummary();
      if (res.success && res.data) setSummary(res.data);
    } catch { /* silent */ }
    finally { setSummaryLoading(false); }
  }, []);

  const reloadAll = useCallback(async () => {
    setSummaryLoading(true);
    try {
      await Promise.all([reloadDestinations(), reloadZones(), reloadSummary()]);
    } finally {
      setSummaryLoading(false);
    }
  }, [reloadDestinations, reloadZones, reloadSummary]);

  useEffect(() => {
    Promise.all([reloadDestinations(), reloadZones(), reloadSummary()])
      .finally(() => setInitialLoading(false));
  }, [reloadDestinations, reloadZones, reloadSummary]);

  const navigateTo = useCallback((section: RoutingSectionId, filter?: NavigationFilter) => {
    setPendingFilter(filter ?? null);
    setActiveSection(section);
  }, []);

  const consumeFilter = useCallback(() => {
    setPendingFilter(null);
  }, []);

  return (
    <RoutingContext.Provider value={{
      destinations, zones, summary, summaryLoading, initialLoading,
      reloadDestinations, reloadZones, reloadSummary, reloadAll,
      activeSection, navigateTo, pendingFilter, consumeFilter,
    }}>
      {children}
    </RoutingContext.Provider>
  );
}
