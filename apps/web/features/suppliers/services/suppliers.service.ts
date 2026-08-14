import { apiClient } from '../../../lib/api/api-client';
import type {
  ListSuppliersParams,
  PaginatedSuppliers,
  Supplier,
  SupplierInput,
} from '../types/supplier.types';
const queryString = (params: ListSuppliersParams) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.type) query.set('type', params.type);
  return query.toString();
};
export const suppliersService = {
  getSuppliers: (params: ListSuppliersParams) =>
    apiClient.get<PaginatedSuppliers>(`/suppliers?${queryString(params)}`),
  getSupplier: (id: string) => apiClient.get<Supplier>(`/suppliers/${id}`),
  createSupplier: (input: SupplierInput) =>
    apiClient.post<Supplier, SupplierInput>('/suppliers', input),
  updateSupplier: (id: string, input: SupplierInput) =>
    apiClient.patch<Supplier, SupplierInput>(`/suppliers/${id}`, input),
  updateSupplierStatus: (id: string, isActive: boolean) =>
    apiClient.patch<Supplier, { isActive: boolean }>(`/suppliers/${id}/status`, { isActive }),
};
