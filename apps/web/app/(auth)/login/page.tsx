'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, Boxes, ShieldCheck } from 'lucide-react';
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
    <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-white shadow-2xl shadow-slate-950/30 lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden bg-slate-900 px-10 py-11 text-white lg:flex lg:flex-col">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 size-64 rounded-full bg-blue-400/10 blur-3xl" />
        <Link className="relative z-10 flex items-center gap-3 self-start font-semibold tracking-tight" href="/">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-700 shadow-lg shadow-blue-950/30">
            <Boxes aria-hidden="true" className="size-5" />
          </span>
          ERP Next
        </Link>

        <div className="relative z-10 my-auto max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-sm font-medium text-blue-200">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Ambiente seguro da sua empresa
          </p>
          <h1 className="mt-7 text-4xl font-semibold leading-tight tracking-tight">
            Gestão com clareza para a rotina que não para.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-300">
            Acesse o ambiente da sua empresa para acompanhar operações, estoque, vendas e financeiro
            em um só lugar.
          </p>
        </div>

        <p className="relative z-10 text-sm leading-6 text-slate-400">
          Seus dados permanecem protegidos por acesso individual e permissões por função.
        </p>
      </aside>

      <div className="flex min-h-full flex-col px-6 py-8 sm:px-10 sm:py-11 lg:px-12">
        <div className="flex items-center justify-between gap-4 lg:hidden">
          <Link className="flex items-center gap-2 font-semibold tracking-tight text-slate-950" href="/">
            <span className="grid size-9 place-items-center rounded-lg bg-blue-700 text-white">
              <Boxes aria-hidden="true" className="size-5" />
            </span>
            ERP Next
          </Link>
        </div>

        <div className="my-auto w-full max-w-sm">
          <p className="text-sm font-semibold text-blue-700">Acesso ao ambiente</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Bem-vindo de volta.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Informe suas credenciais para continuar para o painel da empresa.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>

        <Link
          className="mt-10 inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-700"
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar à página inicial
        </Link>
      </div>
    </section>
  );
}
