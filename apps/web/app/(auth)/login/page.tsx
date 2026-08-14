'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginForm } from '../../../features/auth/components/login-form';
import { useAuth } from '../../../features/auth/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return <p className="text-sm text-slate-600">Verificando sessão…</p>;
  }

  return (
    <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm sm:p-9">
      <p className="text-sm font-semibold text-blue-700">ERP Next</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Acesse sua conta</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Use suas credenciais para entrar no ambiente da empresa.
      </p>
      <div className="mt-7">
        <LoginForm />
      </div>
    </section>
  );
}
