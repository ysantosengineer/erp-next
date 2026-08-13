'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { suppliersService } from '../services/suppliers.service';
import type { ListSuppliersParams, SupplierInput } from '../types/supplier.types';
export const supplierQueryKeys = {
  all: ['suppliers'] as const,
  list: (params: ListSuppliersParams) => [...supplierQueryKeys.all, 'list', params] as const,
  detail: (id: string) => [...supplierQueryKeys.all, 'detail', id] as const,
};
export function useSuppliers(params: ListSuppliersParams) {
  return useQuery({
    queryKey: supplierQueryKeys.list(params),
    queryFn: () => suppliersService.getSuppliers(params),
  });
}
function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: supplierQueryKeys.all });
}
export function useCreateSupplier() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: SupplierInput) => suppliersService.createSupplier(input),
    onSuccess: invalidate,
  });
}
export function useUpdateSupplier() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierInput }) =>
      suppliersService.updateSupplier(id, input),
    onSuccess: invalidate,
  });
}
export function useUpdateSupplierStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      suppliersService.updateSupplierStatus(id, isActive),
    onSuccess: invalidate,
  });
}
