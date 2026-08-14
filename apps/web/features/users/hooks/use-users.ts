'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services/users.service';
import type { CreateUserInput, ListUsersParams, UpdateUserInput } from '../types/user.types';

export const userQueryKeys = {
  all: ['users'] as const,
  list: (params: ListUsersParams) => [...userQueryKeys.all, 'list', params] as const,
};

export function useUsers(params: ListUsersParams) {
  return useQuery({
    queryKey: userQueryKeys.list(params),
    queryFn: () => usersService.getUsers(params),
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersService.createUser(input),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      usersService.updateUser(id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateUserStatus() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersService.updateUserStatus(id, isActive),
    onSuccess: invalidate,
  });
}

export function useUpdateUserRoles() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      usersService.updateUserRoles(id, roleIds),
    onSuccess: invalidate,
  });
}
