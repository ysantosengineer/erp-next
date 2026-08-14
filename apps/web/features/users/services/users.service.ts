import { apiClient } from '../../../lib/api/api-client';
import type {
  CreateUserInput,
  ListUsersParams,
  PaginatedUsers,
  UpdateUserInput,
  User,
} from '../types/user.types';

function queryString(params: ListUsersParams): string {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  return query.toString();
}

export const usersService = {
  getUsers: (params: ListUsersParams) =>
    apiClient.get<PaginatedUsers>(`/users?${queryString(params)}`),
  createUser: (input: CreateUserInput) => apiClient.post<User, CreateUserInput>('/users', input),
  updateUser: (id: string, input: UpdateUserInput) =>
    apiClient.patch<User, UpdateUserInput>(`/users/${id}`, input),
  updateUserStatus: (id: string, isActive: boolean) =>
    apiClient.patch<User, { isActive: boolean }>(`/users/${id}/status`, { isActive }),
  updateUserRoles: (id: string, roleIds: string[]) =>
    apiClient.put<User, { roleIds: string[] }>(`/users/${id}/roles`, { roleIds }),
};
