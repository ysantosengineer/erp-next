export type ProductStatusFilter = 'active' | 'inactive';
export type ProductSortField =
  'name' | 'sku' | 'costPrice' | 'salePrice' | 'createdAt' | 'updatedAt';

export type ProductCategory = { id: string; name: string; isActive: boolean };
export type ProductUnit = ProductCategory & { symbol: string };
export type ProductSupplier = ProductCategory & { document: string };

export type Product = {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  costPrice: string;
  salePrice: string;
  weight: string | null;
  height: string | null;
  width: string | null;
  length: string | null;
  minimumStock: string;
  isActive: boolean;
  category: ProductCategory;
  unit: ProductUnit;
  primarySupplier: ProductSupplier | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  name: string;
  description?: string | null;
  sku: string;
  barcode?: string | null;
  categoryId: string;
  unitId: string;
  primarySupplierId?: string | null;
  costPrice: string;
  salePrice: string;
  weight?: string | null;
  height?: string | null;
  width?: string | null;
  length?: string | null;
  minimumStock?: string;
};

export type ListProductsParams = {
  page: number;
  limit: number;
  search?: string;
  status?: ProductStatusFilter;
  categoryId?: string;
  unitId?: string;
  supplierId?: string;
  sortBy: ProductSortField;
  sortOrder: 'asc' | 'desc';
};

export type PaginatedProducts = {
  data: Product[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type CatalogOption = { id: string; name: string; symbol?: string; isActive: boolean };
export type SupplierOption = { id: string; name: string; document: string; isActive: boolean };
export type PaginatedOptions<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
