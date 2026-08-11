'use client';

import { useAuth } from '../../features/auth/hooks/use-auth';
import type { PermissionCode } from '../../lib/permissions/permissions';

export function Can({
  permission,
  children,
}: Readonly<{ permission: PermissionCode; children: React.ReactNode }>) {
  const { user } = useAuth();
  return user?.permissions.includes(permission) ? <>{children}</> : null;
}

export function usePermission(permission: PermissionCode): boolean {
  const { user } = useAuth();
  return user?.permissions.includes(permission) ?? false;
}
