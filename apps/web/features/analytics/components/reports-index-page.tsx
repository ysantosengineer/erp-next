'use client';

import Link from 'next/link';
import { BarChart3, Boxes, CircleDollarSign, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../auth/hooks/use-auth';
import { PERMISSIONS } from '../../../lib/permissions/permissions';

const reports = [
  {
    href: '/reports/sales',
    title: 'Vendas',
    description: 'Pedidos válidos, evolução e produtos vendidos.',
    permission: PERMISSIONS.SALES_ORDERS_READ,
    icon: BarChart3,
  },
  {
    href: '/reports/purchases',
    title: 'Compras',
    description: 'Pedidos, aprovações e progresso dos recebimentos.',
    permission: PERMISSIONS.PURCHASE_ORDERS_READ,
    icon: ShoppingCart,
  },
  {
    href: '/reports/inventory',
    title: 'Estoque',
    description: 'Posição física, reservada e disponível por endereço.',
    permission: PERMISSIONS.INVENTORY_READ,
    icon: Boxes,
  },
  {
    href: '/reports/finance',
    title: 'Financeiro',
    description: 'Títulos, saldos pendentes e situação de vencimento.',
    permission: PERMISSIONS.FINANCE_READ,
    icon: CircleDollarSign,
  },
] as const;

export function ReportsIndexPage() {
  const { user } = useAuth();
  const available = reports.filter((report) => user?.permissions.includes(report.permission));
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-700">Análises</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Relatórios gerenciais
        </h1>
        <p className="mt-2 text-slate-600">
          Escolha uma visão. Cada relatório mostra apenas dados da empresa e dos módulos
          autorizados.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        {available.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              href={report.href}
              className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow"
            >
              <Icon aria-hidden className="size-6 text-blue-700" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950 group-hover:text-blue-800">
                {report.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{report.description}</p>
            </Link>
          );
        })}
      </section>
      {available.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          Nenhum relatório está disponível para o seu perfil.
        </p>
      ) : null}
    </div>
  );
}
