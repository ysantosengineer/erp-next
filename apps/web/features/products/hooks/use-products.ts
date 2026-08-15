'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../services/products.service';
import type { ListProductsParams, ProductInput } from '../types/product.types';

export const productQueryKeys = {
  all: ['products'] as const,
  list: (params: ListProductsParams) => [...productQueryKeys.all, 'list', params] as const,
  detail: (id: string) => [...productQueryKeys.all, 'detail', id] as const,
  options: ['product-options'] as const,
};

export function useProducts(params: ListProductsParams) {
  return useQuery({
    queryKey: productQueryKeys.list(params),
    queryFn: () => productsService.getProducts(params),
  });
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: productQueryKeys.detail(id ?? ''),
    queryFn: () => productsService.getProduct(id!),
    enabled: Boolean(id),
  });
}

export function useProductOptions() {
  return {
    categories: useQuery({
      queryKey: [...productQueryKeys.options, 'categories'],
      queryFn: productsService.getActiveCategories,
      staleTime: 5 * 60 * 1000,
    }),
    units: useQuery({
      queryKey: [...productQueryKeys.options, 'units'],
      queryFn: productsService.getActiveUnits,
      staleTime: 5 * 60 * 1000,
    }),
    suppliers: useQuery({
      queryKey: [...productQueryKeys.options, 'suppliers'],
      queryFn: productsService.getActiveSuppliers,
      staleTime: 5 * 60 * 1000,
    }),
  };
}

function useInvalidateProducts() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: productQueryKeys.all });
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({ mutationFn: productsService.createProduct, onSuccess: invalidate });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      productsService.updateProduct(id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateProductStatus() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      productsService.updateProductStatus(id, isActive),
    onSuccess: invalidate,
  });
}
