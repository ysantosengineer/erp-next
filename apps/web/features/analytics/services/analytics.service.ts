import { apiClient } from '../../../lib/api/api-client';
import type {
  AnalyticsFilters,
  DashboardAnalytics,
  FinanceReportRow,
  InventoryReportRow,
  PurchaseReportRow,
  ReportFilters,
  ReportResponse,
  SalesReportRow,
} from '../types/analytics.types';

function queryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export const analyticsService = {
  dashboard: (filters: AnalyticsFilters) =>
    apiClient.get<DashboardAnalytics>(`/analytics/dashboard?${queryString(filters)}`),
  sales: (filters: ReportFilters) =>
    apiClient.get<ReportResponse<SalesReportRow>>(`/analytics/sales?${queryString(filters)}`),
  purchases: (filters: ReportFilters) =>
    apiClient.get<ReportResponse<PurchaseReportRow>>(
      `/analytics/purchases?${queryString(filters)}`,
    ),
  inventory: (filters: ReportFilters) =>
    apiClient.get<ReportResponse<InventoryReportRow>>(
      `/analytics/inventory?${queryString(filters)}`,
    ),
  finance: (filters: ReportFilters) => {
    const { startDate, endDate, sortBy: _sortBy, warehouseId: _warehouseId, ...rest } = filters;
    return apiClient.get<ReportResponse<FinanceReportRow>>(
      `/analytics/finance?${queryString({ ...rest, startDueDate: startDate, endDueDate: endDate, sortBy: 'dueDate' })}`,
    );
  },
};
