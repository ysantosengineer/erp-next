export type StatusFilter = 'active' | 'inactive';

export type Warehouse = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  locationCount: number;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseInput = {
  name: string;
  code: string;
  description?: string | null;
};

export type ListWarehousesParams = {
  page: number;
  limit: number;
  search?: string;
  status?: StatusFilter;
  sortBy: 'name' | 'code' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
};

export type PaginatedWarehouses = {
  data: Warehouse[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
