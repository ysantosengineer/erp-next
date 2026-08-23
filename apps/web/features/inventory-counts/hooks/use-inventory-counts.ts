'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryQueryKeys } from '../../inventory/hooks/use-inventory';
import { inventoryCountsService } from '../services/inventory-counts.service';
import type {
  InventoryCountDetailParams,
  InventoryCountListParams,
} from '../types/inventory-count.types';

export const inventoryCountQueryKeys = {
  all: ['inventory-counts'] as const,
  list: (filters: InventoryCountListParams) => ['inventory-counts', filters] as const,
  details: ['inventory-count'] as const,
  detail: (id: string, filters: InventoryCountDetailParams) =>
    ['inventory-count', id, filters] as const,
  items: (id: string, filters: InventoryCountDetailParams) =>
    ['inventory-count-items', id, filters] as const,
  options: (warehouseId: string) => ['inventory-counts', 'options', warehouseId] as const,
};

export const useInventoryCounts = (params: InventoryCountListParams) =>
  useQuery({
    queryKey: inventoryCountQueryKeys.list(params),
    queryFn: () => inventoryCountsService.getInventoryCounts(params),
  });

export const useInventoryCount = (id: string, params: InventoryCountDetailParams) =>
  useQuery({
    queryKey: inventoryCountQueryKeys.detail(id, params),
    queryFn: () => inventoryCountsService.getInventoryCount(id, params),
    enabled: Boolean(id),
  });

export const useInventoryCountOptions = (warehouseId: string) =>
  useQuery({
    queryKey: inventoryCountQueryKeys.options(warehouseId),
    queryFn: () => inventoryCountsService.getInventoryCountOptions(warehouseId),
    enabled: Boolean(warehouseId),
    staleTime: 5 * 60 * 1000,
  });

const useInvalidateCounts = () => {
  const client = useQueryClient();
  return (id?: string) =>
    Promise.all([
      client.invalidateQueries({ queryKey: inventoryCountQueryKeys.all }),
      client.invalidateQueries({ queryKey: inventoryCountQueryKeys.details }),
      ...(id ? [client.invalidateQueries({ queryKey: ['inventory-count-items', id] })] : []),
    ]);
};

export const useCreateInventoryCount = () => {
  const invalidate = useInvalidateCounts();
  return useMutation({
    mutationFn: inventoryCountsService.createInventoryCount,
    onSuccess: () => invalidate(),
  });
};

const useCountCommand = <TInput extends { id: string }>(
  mutationFn: (input: TInput) => Promise<unknown>,
) => {
  const invalidate = useInvalidateCounts();
  return useMutation({ mutationFn, onSuccess: (_, input) => invalidate(input.id) });
};

export const useStartInventoryCount = () =>
  useCountCommand(({ id }: { id: string }) => inventoryCountsService.startInventoryCount(id));
export const useAddInventoryCountItem = () =>
  useCountCommand(inventoryCountsService.addInventoryCountItem);
export const useSubmitInventoryCountItem = () =>
  useCountCommand(inventoryCountsService.submitInventoryCountItem);
export const useRequestInventoryRecount = () =>
  useCountCommand(({ id }: { id: string }) => inventoryCountsService.requestRecount(id));
export const useSubmitInventoryRecount = () =>
  useCountCommand(inventoryCountsService.submitInventoryRecount);
export const useCancelInventoryCount = () =>
  useCountCommand(({ id }: { id: string }) => inventoryCountsService.cancelInventoryCount(id));

export const useApproveInventoryCount = () => {
  const client = useQueryClient();
  const invalidate = useInvalidateCounts();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => inventoryCountsService.approveInventoryCount(id),
    onSuccess: (_, input) =>
      Promise.all([
        invalidate(input.id),
        client.invalidateQueries({ queryKey: inventoryQueryKeys.balanceRoot }),
        client.invalidateQueries({ queryKey: inventoryQueryKeys.movementRoot }),
      ]),
  });
};
