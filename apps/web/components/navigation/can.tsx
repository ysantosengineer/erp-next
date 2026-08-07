'use client';

import { useAuth } from '../../features/auth/hooks/use-auth';

export function Can({
  permission,
  children,
}: Readonly<{ permission: string; children: React.ReactNode }>) {
  const { user } = useAuth();
  return user?.permissions.includes(permission) ? <>{children}</> : null;
}

export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  return user?.permissions.includes(permission) ?? false;
}
