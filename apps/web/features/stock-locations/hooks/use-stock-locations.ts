'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { warehouseQueryKeys } from '../../warehouses/hooks/use-warehouses';
import { stockLocationsService } from '../services/stock-locations.service';
import type { ListStockLocationsParams, StockLocationInput } from '../types/stock-location.types';

export const stockLocationQueryKeys = {
  all: ['stock-locations'] as const,
  warehouse: (warehouseId: string) => [...stockLocationQueryKeys.all, warehouseId] as const,
  list: (warehouseId: string, params: ListStockLocationsParams) =>
    [...stockLocationQueryKeys.warehouse(warehouseId), 'list', params] as const,
  detail: (warehouseId: string, id: string) =>
    [...stockLocationQueryKeys.warehouse(warehouseId), 'detail', id] as const,
};

export function useStockLocations(warehouseId: string, params: ListStockLocationsParams) {
  return useQuery({
    queryKey: stockLocationQueryKeys.list(warehouseId, params),
    queryFn: () => stockLocationsService.getStockLocations(warehouseId, params),
  });
}

const useInvalidateLocations = (warehouseId: string) => {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: stockLocationQueryKeys.warehouse(warehouseId) }),
      client.invalidateQueries({ queryKey: warehouseQueryKeys.all }),
    ]);
};

export function useCreateStockLocation(warehouseId: string) {
  const invalidate = useInvalidateLocations(warehouseId);
  return useMutation({
    mutationFn: (input: StockLocationInput) =>
      stockLocationsService.createStockLocation(warehouseId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateStockLocation(warehouseId: string) {
  const invalidate = useInvalidateLocations(warehouseId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StockLocationInput }) =>
      stockLocationsService.updateStockLocation(warehouseId, id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateStockLocationStatus(warehouseId: string) {
  const invalidate = useInvalidateLocations(warehouseId);
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      stockLocationsService.updateStockLocationStatus(warehouseId, id, isActive),
    onSuccess: invalidate,
  });
}
