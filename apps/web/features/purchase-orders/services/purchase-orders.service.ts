import { apiClient } from '../../../lib/api/api-client';
import type {
  PaginatedPurchaseOrders,
  PurchaseOrder,
  PurchaseOrderFilters,
  PurchaseOrderInput,
  PurchaseOrderOptions,
} from '../types/purchase-order.types';

const listQuery = (filters: PurchaseOrderFilters) => {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (value && !['page', 'limit', 'sortBy', 'sortOrder'].includes(key))
      query.set(key, String(value));
  });
  return query.toString();
};

export const purchaseOrdersService = {
  list: (filters: PurchaseOrderFilters) =>
    apiClient.get<PaginatedPurchaseOrders>(`/purchase-orders?${listQuery(filters)}`),
  detail: (id: string) => apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`),
  options: (productSearch = '') =>
    apiClient.get<PurchaseOrderOptions>(
      `/purchase-orders/options${productSearch ? `?productSearch=${encodeURIComponent(productSearch)}` : ''}`,
    ),
  create: (input: PurchaseOrderInput) =>
    apiClient.post<PurchaseOrder, PurchaseOrderInput>('/purchase-orders', input),
  update: ({ id, input }: { id: string; input: PurchaseOrderInput }) =>
    apiClient.patch<PurchaseOrder, PurchaseOrderInput>(`/purchase-orders/${id}`, input),
  submit: (id: string) =>
    apiClient.post<PurchaseOrder, Record<string, never>>(`/purchase-orders/${id}/submit`, {}),
  approve: (id: string) =>
    apiClient.post<PurchaseOrder, Record<string, never>>(`/purchase-orders/${id}/approve`, {}),
  cancel: ({ id, reason }: { id: string; reason: string }) =>
    apiClient.post<PurchaseOrder, { reason: string }>(`/purchase-orders/${id}/cancel`, { reason }),
};
