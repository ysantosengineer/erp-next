'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';

export function AuthGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-slate-600">
        Carregando sessão…
      </main>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
