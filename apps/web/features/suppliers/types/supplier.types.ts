export type SupplierType = 'INDIVIDUAL' | 'COMPANY';
export type SupplierStatusFilter = 'active' | 'inactive';
export type SupplierAddress = {
  id?: string;
  postalCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
};
export type Supplier = {
  id: string;
  type: SupplierType;
  name: string;
  tradeName: string | null;
  document: string;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  notes: string | null;
  isActive: boolean;
  address: SupplierAddress | null;
  createdAt: string;
  updatedAt: string;
};
export type SupplierInput = {
  type: SupplierType;
  name: string;
  document: string;
  tradeName?: string | null;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  notes?: string | null;
  address?: Omit<SupplierAddress, 'id'>;
};
export type ListSuppliersParams = {
  page: number;
  limit: number;
  search?: string;
  status?: SupplierStatusFilter;
  type?: SupplierType;
  sortBy: 'name' | 'document' | 'createdAt';
  sortOrder: 'asc' | 'desc';
};
export type PaginatedSuppliers = {
  data: Supplier[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
