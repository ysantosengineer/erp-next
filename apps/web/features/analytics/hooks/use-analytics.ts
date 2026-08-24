'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import type {
  AnalyticsFilters,
  AnalyticsReportResponse,
  ReportFilters,
} from '../types/analytics.types';

export const analyticsKeys = {
  dashboard: (filters: AnalyticsFilters) => ['analytics', 'dashboard', filters] as const,
  report: (kind: string, filters: ReportFilters) => ['analytics', 'report', kind, filters] as const,
};

export const useDashboardAnalytics = (filters: AnalyticsFilters) =>
  useQuery({
    queryKey: analyticsKeys.dashboard(filters),
    queryFn: () => analyticsService.dashboard(filters),
    staleTime: 30_000,
  });

export const useAnalyticsReport = (
  kind: 'sales' | 'purchases' | 'inventory' | 'finance',
  filters: ReportFilters,
) =>
  useQuery<AnalyticsReportResponse>({
    queryKey: analyticsKeys.report(kind, filters),
    queryFn: async () => {
      if (kind === 'sales') return analyticsService.sales(filters);
      if (kind === 'purchases') return analyticsService.purchases(filters);
      if (kind === 'inventory') return analyticsService.inventory(filters);
      return analyticsService.finance(filters);
    },
    placeholderData: (previous: AnalyticsReportResponse | undefined) => previous,
    staleTime: 30_000,
  });
