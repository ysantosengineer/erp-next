export type UserRole = { id: string; name: string };

export type User = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
};

export type UserStatusFilter = 'active' | 'inactive';
export type UserSortField = 'name' | 'email' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export type ListUsersParams = {
  page: number;
  limit: number;
  search?: string;
  status?: UserStatusFilter;
  sortBy: UserSortField;
  sortOrder: SortOrder;
};

export type PaginatedUsers = {
  data: User[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type CreateUserInput = { name: string; email: string; password: string; roleIds: string[] };
export type UpdateUserInput = { name: string; email: string };
