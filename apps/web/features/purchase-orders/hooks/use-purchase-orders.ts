'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersService } from '../services/purchase-orders.service';
import type { PurchaseOrderFilters } from '../types/purchase-order.types';

export const purchaseOrderKeys = {
  all: ['purchase-orders'] as const,
  list: (filters: PurchaseOrderFilters) => ['purchase-orders', 'list', filters] as const,
  detail: (id: string) => ['purchase-orders', 'detail', id] as const,
  options: (search: string) => ['purchase-orders', 'options', search] as const,
};
export const usePurchaseOrders = (filters: PurchaseOrderFilters) =>
  useQuery({
    queryKey: purchaseOrderKeys.list(filters),
    queryFn: () => purchaseOrdersService.list(filters),
  });
export const usePurchaseOrder = (id?: string) =>
  useQuery({
    queryKey: purchaseOrderKeys.detail(id ?? ''),
    queryFn: () => purchaseOrdersService.detail(id!),
    enabled: Boolean(id),
  });
export const usePurchaseOrderOptions = (search = '') =>
  useQuery({
    queryKey: purchaseOrderKeys.options(search),
    queryFn: () => purchaseOrdersService.options(search),
    staleTime: 60_000,
  });
function useInvalidate() {
  const client = useQueryClient();
  return (id?: string) => {
    void client.invalidateQueries({ queryKey: purchaseOrderKeys.all });
    if (id) void client.invalidateQueries({ queryKey: purchaseOrderKeys.detail(id) });
  };
}
export function useCreatePurchaseOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: purchaseOrdersService.create,
    onSuccess: (order) => invalidate(order.id),
  });
}
export function useUpdatePurchaseOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: purchaseOrdersService.update,
    onSuccess: (order) => invalidate(order.id),
  });
}
export function useSubmitPurchaseOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: purchaseOrdersService.submit,
    onSuccess: (order) => invalidate(order.id),
  });
}
export function useApprovePurchaseOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: purchaseOrdersService.approve,
    onSuccess: (order) => invalidate(order.id),
  });
}
export function useCancelPurchaseOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: purchaseOrdersService.cancel,
    onSuccess: (order) => invalidate(order.id),
  });
}
