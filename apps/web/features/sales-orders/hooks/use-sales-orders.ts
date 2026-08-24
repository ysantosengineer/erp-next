'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesOrdersService } from '../services/sales-orders.service';
import type { SalesOrderFilters } from '../types/sales-order.types';

export const salesOrderKeys = {
  all: ['sales-orders'] as const,
  list: (filters: SalesOrderFilters) => ['sales-orders', 'list', filters] as const,
  detail: (id: string) => ['sales-orders', 'detail', id] as const,
  options: (search: string) => ['sales-orders', 'options', search] as const,
};

export const useSalesOrders = (filters: SalesOrderFilters) =>
  useQuery({
    queryKey: salesOrderKeys.list(filters),
    queryFn: () => salesOrdersService.list(filters),
  });

export const useSalesOrder = (id?: string) =>
  useQuery({
    queryKey: salesOrderKeys.detail(id ?? ''),
    queryFn: () => salesOrdersService.detail(id!),
    enabled: Boolean(id),
  });

export const useSalesOrderOptions = (search = '') =>
  useQuery({
    queryKey: salesOrderKeys.options(search),
    queryFn: () => salesOrdersService.options(search),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

function useInvalidateSalesOrders() {
  const client = useQueryClient();
  return (id?: string) => {
    void client.invalidateQueries({ queryKey: salesOrderKeys.all });
    if (id) void client.invalidateQueries({ queryKey: salesOrderKeys.detail(id) });
  };
}

export function useCreateSalesOrder() {
  const invalidate = useInvalidateSalesOrders();
  return useMutation({
    mutationFn: salesOrdersService.create,
    onSuccess: (order) => invalidate(order.id),
  });
}

export function useUpdateSalesOrder() {
  const invalidate = useInvalidateSalesOrders();
  return useMutation({
    mutationFn: salesOrdersService.update,
    onSuccess: (order) => invalidate(order.id),
  });
}

export function useConfirmSalesOrder() {
  const invalidate = useInvalidateSalesOrders();
  return useMutation({
    mutationFn: salesOrdersService.confirm,
    onSuccess: (order) => invalidate(order.id),
  });
}

export function useCancelSalesOrder() {
  const invalidate = useInvalidateSalesOrders();
  return useMutation({
    mutationFn: salesOrdersService.cancel,
    onSuccess: (order) => invalidate(order.id),
  });
}
