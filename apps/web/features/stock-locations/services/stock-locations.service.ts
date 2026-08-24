import { apiClient } from '../../../lib/api/api-client';
import type {
  ListStockLocationsParams,
  PaginatedStockLocations,
  StockLocation,
  StockLocationInput,
} from '../types/stock-location.types';

const queryString = (params: ListStockLocationsParams) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.zone) query.set('zone', params.zone);
  return query.toString();
};

const root = (warehouseId: string) => `/warehouses/${warehouseId}/locations`;

export const stockLocationsService = {
  getStockLocations: (warehouseId: string, params: ListStockLocationsParams) =>
    apiClient.get<PaginatedStockLocations>(`${root(warehouseId)}?${queryString(params)}`),
  getStockLocation: (warehouseId: string, id: string) =>
    apiClient.get<StockLocation>(`${root(warehouseId)}/${id}`),
  createStockLocation: (warehouseId: string, input: StockLocationInput) =>
    apiClient.post<StockLocation, StockLocationInput>(root(warehouseId), input),
  updateStockLocation: (warehouseId: string, id: string, input: StockLocationInput) =>
    apiClient.patch<StockLocation, StockLocationInput>(`${root(warehouseId)}/${id}`, input),
  updateStockLocationStatus: (warehouseId: string, id: string, isActive: boolean) =>
    apiClient.patch<StockLocation, { isActive: boolean }>(`${root(warehouseId)}/${id}/status`, {
      isActive,
    }),
};
