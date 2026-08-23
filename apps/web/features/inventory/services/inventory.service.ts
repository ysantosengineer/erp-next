import { apiClient } from '../../../lib/api/api-client';
import type {
  AdjustmentInput,
  BalanceParams,
  EntryInput,
  ExitInput,
  InventoryBalance,
  InventoryOptions,
  ProductBalance,
  MovementParams,
  PaginatedBalances,
  PaginatedMovements,
  StockMovement,
  TransferInput,
} from '../types/inventory.types';

const queryString = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
};

export const inventoryService = {
  getBalances: (params: BalanceParams) =>
    apiClient.get<PaginatedBalances>(`/inventory?${queryString(params)}`),
  getBalance: (id: string) => apiClient.get<InventoryBalance>(`/inventory/${id}`),
  getProductBalance: (productId: string) =>
    apiClient.get<ProductBalance>(`/inventory/products/${productId}`),
  getOptions: () => apiClient.get<InventoryOptions>('/inventory/options'),
  getMovements: (params: MovementParams) =>
    apiClient.get<PaginatedMovements>(`/inventory/movements?${queryString(params)}`),
  getMovement: (id: string) => apiClient.get<StockMovement>(`/inventory/movements/${id}`),
  createEntry: (input: EntryInput) =>
    apiClient.post<StockMovement, EntryInput>('/inventory/movements/entry', input),
  createExit: (input: ExitInput) =>
    apiClient.post<StockMovement, ExitInput>('/inventory/movements/exit', input),
  createAdjustment: (input: AdjustmentInput) =>
    apiClient.post<StockMovement, AdjustmentInput>('/inventory/movements/adjustment', input),
  createTransfer: (input: TransferInput) =>
    apiClient.post<StockMovement, TransferInput>('/inventory/movements/transfer', input),
};
