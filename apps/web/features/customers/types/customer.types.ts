export type CustomerType = 'INDIVIDUAL' | 'COMPANY';
export type CustomerStatusFilter = 'active' | 'inactive';

export type CustomerAddress = {
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

export type Customer = {
  id: string;
  type: CustomerType;
  name: string;
  tradeName: string | null;
  document: string;
  email: string | null;
  phone: string | null;
  creditLimit: string;
  notes: string | null;
  isActive: boolean;
  address: CustomerAddress | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerInput = {
  type: CustomerType;
  name: string;
  document: string;
  creditLimit: string;
  tradeName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  address?: Omit<CustomerAddress, 'id'> | null;
};

export type ListCustomersParams = {
  page: number;
  limit: number;
  search?: string;
  status?: CustomerStatusFilter;
  type?: CustomerType;
  sortBy: 'name' | 'document' | 'creditLimit' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
};

export type PaginatedCustomers = {
  data: Customer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
