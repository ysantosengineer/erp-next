import { apiClient } from '../../../lib/api/api-client';
import type {
  AddInventoryCountItemInput,
  CreateInventoryCountInput,
  InventoryCount,
  InventoryCountDetail,
  InventoryCountDetailParams,
  InventoryCountListParams,
  InventoryCountOptions,
  PaginatedInventoryCounts,
  SubmitCountInput,
} from '../types/inventory-count.types';

const queryString = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
};

const detailPath = (id: string, params?: InventoryCountDetailParams) =>
  `/inventory/counts/${id}${params ? `?${queryString(params)}` : ''}`;

export const inventoryCountsService = {
  getInventoryCounts: (params: InventoryCountListParams) =>
    apiClient.get<PaginatedInventoryCounts>(`/inventory/counts?${queryString(params)}`),
  getInventoryCount: (id: string, params: InventoryCountDetailParams) =>
    apiClient.get<InventoryCountDetail>(detailPath(id, params)),
  getInventoryCountOptions: (warehouseId: string) =>
    apiClient.get<InventoryCountOptions>(`/inventory/counts/options?warehouseId=${warehouseId}`),
  createInventoryCount: (input: CreateInventoryCountInput) =>
    apiClient.post<InventoryCount, CreateInventoryCountInput>('/inventory/counts', input),
  startInventoryCount: (id: string) =>
    apiClient.post<InventoryCountDetail, Record<string, never>>(
      `/inventory/counts/${id}/start`,
      {},
    ),
  addInventoryCountItem: ({ id, input }: { id: string; input: AddInventoryCountItemInput }) =>
    apiClient.post<InventoryCountDetail, AddInventoryCountItemInput>(
      `/inventory/counts/${id}/items`,
      input,
    ),
  submitInventoryCountItem: ({ id, itemId, input }: CountMutationInput) =>
    apiClient.put<InventoryCountDetail, SubmitCountInput>(
      `/inventory/counts/${id}/items/${itemId}/count`,
      input,
    ),
  requestRecount: (id: string) =>
    apiClient.post<InventoryCountDetail, Record<string, never>>(
      `/inventory/counts/${id}/recount`,
      {},
    ),
  submitInventoryRecount: ({ id, itemId, input }: CountMutationInput) =>
    apiClient.put<InventoryCountDetail, SubmitCountInput>(
      `/inventory/counts/${id}/items/${itemId}/recount`,
      input,
    ),
  approveInventoryCount: (id: string) =>
    apiClient.post<InventoryCountDetail, Record<string, never>>(
      `/inventory/counts/${id}/approve`,
      {},
    ),
  cancelInventoryCount: (id: string) =>
    apiClient.post<InventoryCountDetail, Record<string, never>>(
      `/inventory/counts/${id}/cancel`,
      {},
    ),
};

type CountMutationInput = { id: string; itemId: string; input: SubmitCountInput };
