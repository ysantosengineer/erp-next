import { apiClient } from '../../../lib/api/api-client';
import type {
  CatalogOption,
  ListProductsParams,
  PaginatedOptions,
  PaginatedProducts,
  Product,
  ProductInput,
  SupplierOption,
} from '../types/product.types';

const queryString = (params: ListProductsParams) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.unitId) query.set('unitId', params.unitId);
  if (params.supplierId) query.set('supplierId', params.supplierId);
  return query.toString();
};

const optionQuery = 'page=1&limit=100&status=active&sortBy=name&sortOrder=asc';

export const productsService = {
  getProducts: (params: ListProductsParams) =>
    apiClient.get<PaginatedProducts>(`/products?${queryString(params)}`),
  getProduct: (id: string) => apiClient.get<Product>(`/products/${id}`),
  createProduct: (input: ProductInput) => apiClient.post<Product, ProductInput>('/products', input),
  updateProduct: (id: string, input: Partial<ProductInput>) =>
    apiClient.patch<Product, Partial<ProductInput>>(`/products/${id}`, input),
  updateProductStatus: (id: string, isActive: boolean) =>
    apiClient.patch<Product, { isActive: boolean }>(`/products/${id}/status`, { isActive }),
  getActiveCategories: () =>
    apiClient.get<PaginatedOptions<CatalogOption>>(`/categories?${optionQuery}`),
  getActiveUnits: () => apiClient.get<PaginatedOptions<CatalogOption>>(`/units?${optionQuery}`),
  getActiveSuppliers: () =>
    apiClient.get<PaginatedOptions<SupplierOption>>(`/suppliers?${optionQuery}`),
};
