'use client';

import { useAuth } from '../../features/auth/hooks/use-auth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-blue-700">Sessão ativa</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Olá, {user?.name.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-slate-600">
          Você está conectado à empresa {user?.company.name}. Os indicadores operacionais estarão
          disponíveis nas próximas etapas.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Status da conta</p>
          <p className="mt-2 text-lg font-semibold text-emerald-700">Acesso autorizado</p>
          <p className="mt-1 text-sm text-slate-600">Sua sessão está protegida e ativa.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Perfil atual</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {user?.roles.join(', ') || 'Sem papel atribuído'}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            As permissões são verificadas pela API a cada operação.
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Versão do projeto</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">Fundação de acesso</p>
          <p className="mt-1 text-sm text-slate-600">
            Os módulos operacionais ainda não possuem dados.
          </p>
        </article>
      </section>
    </div>
  );
}
