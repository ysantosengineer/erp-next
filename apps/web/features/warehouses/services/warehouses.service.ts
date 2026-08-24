import { apiClient } from '../../../lib/api/api-client';
import type {
  ListWarehousesParams,
  PaginatedWarehouses,
  Warehouse,
  WarehouseInput,
} from '../types/warehouse.types';

const queryString = (params: ListWarehousesParams) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  return query.toString();
};

export const warehousesService = {
  getWarehouses: (params: ListWarehousesParams) =>
    apiClient.get<PaginatedWarehouses>(`/warehouses?${queryString(params)}`),
  getWarehouse: (id: string) => apiClient.get<Warehouse>(`/warehouses/${id}`),
  createWarehouse: (input: WarehouseInput) =>
    apiClient.post<Warehouse, WarehouseInput>('/warehouses', input),
  updateWarehouse: (id: string, input: WarehouseInput) =>
    apiClient.patch<Warehouse, WarehouseInput>(`/warehouses/${id}`, input),
  updateWarehouseStatus: (id: string, isActive: boolean) =>
    apiClient.patch<Warehouse, { isActive: boolean }>(`/warehouses/${id}/status`, { isActive }),
};
