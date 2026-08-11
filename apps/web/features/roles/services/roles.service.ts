import { apiClient } from '../../../lib/api/api-client';
import type {
  CreateRoleInput,
  PermissionCatalogItem,
  Role,
  UpdateRoleInput,
} from '../types/role.types';

export const rolesService = {
  getRoles: () => apiClient.get<Role[]>('/roles'),
  getPermissions: () => apiClient.get<PermissionCatalogItem[]>('/permissions'),
  createRole: (input: CreateRoleInput) => apiClient.post<Role, CreateRoleInput>('/roles', input),
  updateRole: (id: string, input: UpdateRoleInput) =>
    apiClient.patch<Role, UpdateRoleInput>(`/roles/${id}`, input),
  deleteRole: (id: string) => apiClient.delete(`/roles/${id}`),
  updateRolePermissions: (id: string, permissionIds: string[]) =>
    apiClient.put<Role, { permissionIds: string[] }>(`/roles/${id}/permissions`, { permissionIds }),
};
