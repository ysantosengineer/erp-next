'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesService } from '../services/roles.service';
import type { CreateRoleInput, UpdateRoleInput } from '../types/role.types';

export const roleQueryKeys = { all: ['roles'] as const, permissions: ['permissions'] as const };

export function useRoles(enabled = true) {
  return useQuery({ queryKey: roleQueryKeys.all, queryFn: rolesService.getRoles, enabled });
}

export function usePermissionCatalog(enabled = true) {
  return useQuery({
    queryKey: roleQueryKeys.permissions,
    queryFn: rolesService.getPermissions,
    enabled,
  });
}

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: roleQueryKeys.all });
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => rolesService.createRole(input),
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRoleInput }) =>
      rolesService.updateRole(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({ mutationFn: rolesService.deleteRole, onSuccess: invalidate });
}

export function useUpdateRolePermissions() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
      rolesService.updateRolePermissions(id, permissionIds),
    onSuccess: invalidate,
  });
}
