'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersService } from '../services/customers.service';
import type { CustomerInput, ListCustomersParams } from '../types/customer.types';

export const customerQueryKeys = {
  all: ['customers'] as const,
  list: (params: ListCustomersParams) => [...customerQueryKeys.all, 'list', params] as const,
  detail: (id: string) => [...customerQueryKeys.all, 'detail', id] as const,
};

export function useCustomers(params: ListCustomersParams) {
  return useQuery({
    queryKey: customerQueryKeys.list(params),
    queryFn: () => customersService.getCustomers(params),
  });
}

function useInvalidateCustomers() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: customerQueryKeys.all });
}

export function useCreateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (input: CustomerInput) => customersService.createCustomer(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerInput }) =>
      customersService.updateCustomer(id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateCustomerStatus() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      customersService.updateCustomerStatus(id, isActive),
    onSuccess: invalidate,
  });
}
