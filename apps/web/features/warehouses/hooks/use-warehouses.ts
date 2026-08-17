'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { warehousesService } from '../services/warehouses.service';
import type { ListWarehousesParams, WarehouseInput } from '../types/warehouse.types';

export const warehouseQueryKeys = {
  all: ['warehouses'] as const,
  list: (params: ListWarehousesParams) => [...warehouseQueryKeys.all, 'list', params] as const,
  detail: (id: string) => [...warehouseQueryKeys.all, 'detail', id] as const,
};

export function useWarehouses(params: ListWarehousesParams) {
  return useQuery({
    queryKey: warehouseQueryKeys.list(params),
    queryFn: () => warehousesService.getWarehouses(params),
  });
}

const useInvalidateWarehouses = () => {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: warehouseQueryKeys.all });
};

export function useCreateWarehouse() {
  const invalidate = useInvalidateWarehouses();
  return useMutation({ mutationFn: warehousesService.createWarehouse, onSuccess: invalidate });
}

export function useUpdateWarehouse() {
  const invalidate = useInvalidateWarehouses();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: WarehouseInput }) =>
      warehousesService.updateWarehouse(id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateWarehouseStatus() {
  const invalidate = useInvalidateWarehouses();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      warehousesService.updateWarehouseStatus(id, isActive),
    onSuccess: invalidate,
  });
}
