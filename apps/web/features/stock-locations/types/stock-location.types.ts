import type { StatusFilter } from '../../warehouses/types/warehouse.types';

export type StockLocation = {
  id: string;
  warehouseId: string;
  code: string;
  description: string | null;
  zone: string | null;
  aisle: string | null;
  rack: string | null;
  level: string | null;
  position: string | null;
  capacity: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StockLocationInput = {
  code: string;
  description?: string | null;
  zone?: string | null;
  aisle?: string | null;
  rack?: string | null;
  level?: string | null;
  position?: string | null;
  capacity?: string | null;
};

export type ListStockLocationsParams = {
  page: number;
  limit: number;
  search?: string;
  status?: StatusFilter;
  zone?: string;
  sortBy: 'code' | 'zone' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
};

export type PaginatedStockLocations = {
  warehouse: { id: string; name: string; code: string; isActive: boolean };
  data: StockLocation[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
