'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { PermissionCode } from '../../../lib/permissions/permissions';
import { useAuth } from '../hooks/use-auth';

export function PermissionGate({
  permission,
  children,
}: Readonly<{ permission: PermissionCode; children: React.ReactNode }>) {
  const router = useRouter();
  const { user } = useAuth();
  const isAllowed = user?.permissions.includes(permission) ?? false;

  useEffect(() => {
    if (user && !isAllowed) router.replace('/unauthorized');
  }, [isAllowed, router, user]);

  if (!isAllowed) return null;
  return <>{children}</>;
}
