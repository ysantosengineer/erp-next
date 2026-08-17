import { apiClient } from '../../../lib/api/api-client';
import type {
  Customer,
  CustomerInput,
  ListCustomersParams,
  PaginatedCustomers,
} from '../types/customer.types';

const queryString = (params: ListCustomersParams) => {
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

export const customersService = {
  getCustomers: (params: ListCustomersParams) =>
    apiClient.get<PaginatedCustomers>(`/customers?${queryString(params)}`),
  getCustomer: (id: string) => apiClient.get<Customer>(`/customers/${id}`),
  createCustomer: (input: CustomerInput) =>
    apiClient.post<Customer, CustomerInput>('/customers', input),
  updateCustomer: (id: string, input: CustomerInput) =>
    apiClient.patch<Customer, CustomerInput>(`/customers/${id}`, input),
  updateCustomerStatus: (id: string, isActive: boolean) =>
    apiClient.patch<Customer, { isActive: boolean }>(`/customers/${id}/status`, { isActive }),
};
