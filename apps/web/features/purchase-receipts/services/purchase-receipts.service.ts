import { apiClient } from '../../../lib/api/api-client';
import type {
  PaginatedPurchaseReceipts,
  PurchaseReceipt,
  PurchaseReceiptFilters,
  PurchaseReceiptInput,
  PurchaseReceiptOptions,
  ReceivablePurchaseOrder,
} from '../types/purchase-receipt.types';

const queryString = (filters: PurchaseReceiptFilters) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
};

export const purchaseReceiptsService = {
  list: (filters: PurchaseReceiptFilters) =>
    apiClient.get<PaginatedPurchaseReceipts>(`/purchase-receipts?${queryString(filters)}`),
  options: () => apiClient.get<PurchaseReceiptOptions>('/purchase-receipts/options'),
  detail: (id: string) => apiClient.get<PurchaseReceipt>(`/purchase-receipts/${id}`),
  receivable: (purchaseOrderId: string) =>
    apiClient.get<ReceivablePurchaseOrder>(`/purchase-orders/${purchaseOrderId}/receivable`),
  create: (input: PurchaseReceiptInput) =>
    apiClient.post<PurchaseReceipt, PurchaseReceiptInput>('/purchase-receipts', input),
};
