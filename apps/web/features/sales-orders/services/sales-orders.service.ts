import { apiClient } from '../../../lib/api/api-client';
import type {
  PaginatedSalesOrders,
  SalesOrder,
  SalesOrderFilters,
  SalesOrderInput,
  SalesOrderOptions,
} from '../types/sales-order.types';

const listQuery = (filters: SalesOrderFilters) => {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (value && !['page', 'limit', 'sortBy', 'sortOrder'].includes(key)) {
      query.set(key, String(value));
    }
  });
  return query.toString();
};

export const salesOrdersService = {
  list: (filters: SalesOrderFilters) =>
    apiClient.get<PaginatedSalesOrders>(`/sales-orders?${listQuery(filters)}`),
  detail: (id: string) => apiClient.get<SalesOrder>(`/sales-orders/${id}`),
  options: (productSearch = '') =>
    apiClient.get<SalesOrderOptions>(
      `/sales-orders/options${productSearch ? `?productSearch=${encodeURIComponent(productSearch)}` : ''}`,
    ),
  create: (input: SalesOrderInput) =>
    apiClient.post<SalesOrder, SalesOrderInput>('/sales-orders', input),
  update: ({ id, input }: { id: string; input: SalesOrderInput }) =>
    apiClient.patch<SalesOrder, SalesOrderInput>(`/sales-orders/${id}`, input),
  confirm: (id: string) =>
    apiClient.post<SalesOrder, Record<string, never>>(`/sales-orders/${id}/confirm`, {}),
  cancel: ({ id, reason }: { id: string; reason: string }) =>
    apiClient.post<SalesOrder, { reason: string }>(`/sales-orders/${id}/cancel`, { reason }),
};
