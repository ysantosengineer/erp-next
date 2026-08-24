'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../auth/hooks/use-auth';
import { formatCurrency, formatDecimalPtBr } from '../../../lib/decimal';
import { useDashboardAnalytics } from '../hooks/use-analytics';
import { MetricCard } from './metric-card';
import { PeriodFilter } from './period-filter';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

export function DashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ startDate: daysAgo(29), endDate: today() });
  const dashboard = useDashboardAnalytics(filters);
  const data = dashboard.data;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Visão gerencial</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Olá, {user?.name.split(' ')[0]}.
          </h1>
          <p className="mt-2 text-slate-600">
            Indicadores reais de {user?.company.name}, respeitando suas permissões.
          </p>
        </div>
        <Link className="text-sm font-semibold text-blue-700 hover:text-blue-900" href="/reports">
          Abrir relatórios →
        </Link>
      </header>
      <PeriodFilter {...filters} onChange={setFilters} />

      {dashboard.isLoading ? <DashboardSkeleton /> : null}
      {dashboard.isError ? (
        <section
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"
        >
          Não foi possível carregar os indicadores. Tente novamente.
        </section>
      ) : null}
      {data ? (
        <>
          {data.alerts.length ? (
            <section aria-labelledby="alerts-title">
              <h2 id="alerts-title" className="mb-3 text-lg font-semibold text-slate-950">
                Pontos de atenção
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {data.alerts.map((alert) => (
                  <Link
                    key={alert.code}
                    href={alert.href}
                    className="rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-400"
                  >
                    <p className="text-sm font-medium text-amber-900">{alert.label}</p>
                    <p className="mt-1 text-xl font-bold text-amber-950">
                      {alert.amount !== undefined ? formatCurrency(alert.amount) : alert.count}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {data.sections.sales ? (
            <section aria-labelledby="sales-title" className="space-y-4">
              <SectionTitle id="sales-title" title="Vendas" href="/reports/sales" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Pedidos válidos"
                  value={String(data.sections.sales.ordersCount)}
                  detail="Confirmados, reservados ou expedidos"
                />
                <MetricCard
                  label="Valor de pedidos"
                  value={formatCurrency(data.sections.sales.grossSalesAmount)}
                  detail="Não representa faturamento fiscal"
                />
                <MetricCard
                  label="Ticket médio"
                  value={formatCurrency(data.sections.sales.averageOrderValue)}
                />
                <MetricCard
                  label="Variação sobre período anterior"
                  value={
                    data.sections.sales.comparison.changePercentage === null
                      ? 'Sem base'
                      : `${data.sections.sales.comparison.changePercentage.toLocaleString('pt-BR')}%`
                  }
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <SeriesCard rows={data.sections.sales.series} />
                <RankingCard rows={data.sections.sales.topProducts} />
              </div>
            </section>
          ) : null}

          {data.sections.purchases ? (
            <section aria-labelledby="purchases-title" className="space-y-4">
              <SectionTitle id="purchases-title" title="Compras" href="/reports/purchases" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Pedidos no período"
                  value={String(data.sections.purchases.ordersCount)}
                />
                <MetricCard
                  label="Compras aprovadas"
                  value={formatCurrency(data.sections.purchases.approvedPurchasesAmount)}
                />
                <MetricCard
                  label="Valor recebido"
                  value={formatCurrency(data.sections.purchases.receivedAmount)}
                  tone="good"
                />
                <MetricCard
                  label="Recebimentos pendentes"
                  value={String(data.sections.purchases.pendingReceiptsCount)}
                  tone={data.sections.purchases.pendingReceiptsCount ? 'warning' : 'default'}
                />
              </div>
            </section>
          ) : null}

          {data.sections.inventory ? (
            <section aria-labelledby="inventory-title" className="space-y-4">
              <SectionTitle id="inventory-title" title="Estoque" href="/reports/inventory" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Produtos ativos"
                  value={String(data.sections.inventory.productsCount)}
                />
                <MetricCard
                  label="Com estoque disponível"
                  value={String(data.sections.inventory.productsWithStock)}
                  tone="good"
                />
                <MetricCard
                  label="Sem estoque"
                  value={String(data.sections.inventory.productsWithoutStock)}
                  tone="warning"
                />
                <MetricCard
                  label="Estoque baixo"
                  value={String(data.sections.inventory.lowStockProducts)}
                  tone="warning"
                />
              </div>
            </section>
          ) : null}

          {data.sections.finance ? (
            <section aria-labelledby="finance-title" className="space-y-4">
              <SectionTitle id="finance-title" title="Financeiro" href="/reports/finance" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="A receber em aberto"
                  value={formatCurrency(data.sections.finance.totalReceivableOpen)}
                />
                <MetricCard
                  label="A pagar em aberto"
                  value={formatCurrency(data.sections.finance.totalPayableOpen)}
                />
                <MetricCard
                  label="Recebido no período"
                  value={formatCurrency(data.sections.finance.receivedInPeriod)}
                  tone="good"
                />
                <MetricCard
                  label="Saldo realizado"
                  value={formatCurrency(data.sections.finance.realizedNet)}
                />
              </div>
            </section>
          ) : null}

          {!Object.values(data.sections).some(Boolean) ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              Você pode acessar o dashboard, mas não possui permissão de leitura nos módulos
              operacionais.
            </p>
          ) : null}
          <p className="text-xs text-slate-500">
            Atualizado em {new Date(data.generatedAt).toLocaleString('pt-BR')}. Datas civis
            calculadas em UTC.
          </p>
        </>
      ) : null}
    </div>
  );
}

function SectionTitle({ id, title, href }: Readonly<{ id: string; title: string; href: string }>) {
  return (
    <div className="flex items-center justify-between">
      <h2 id={id} className="text-xl font-semibold text-slate-950">
        {title}
      </h2>
      <Link className="text-sm font-semibold text-blue-700" href={href}>
        Ver relatório
      </Link>
    </div>
  );
}

function SeriesCard({ rows }: Readonly<{ rows: Array<{ period: string; amount: string }> }>) {
  const max = Math.max(...rows.map((row) => Number(row.amount)), 1);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-950">Evolução do valor de pedidos</h3>
      {rows.length ? (
        <div className="mt-5 flex h-40 items-end gap-1" aria-label="Gráfico de evolução das vendas">
          {rows.map((row) => (
            <div
              key={row.period}
              className="group flex min-w-1 flex-1 flex-col justify-end"
              title={`${row.period}: ${formatCurrency(row.amount)}`}
            >
              <div
                className="rounded-t bg-blue-600"
                style={{ height: `${Math.max(4, (Number(row.amount) / max) * 100)}%` }}
              />
              <span className="sr-only">
                {row.period}: {formatCurrency(row.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Empty />
      )}
    </article>
  );
}

function RankingCard({
  rows,
}: Readonly<{
  rows: Array<{ id: string; name: string; sku: string; quantity: string; unitSymbol: string }>;
}>) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-950">Produtos mais vendidos</h3>
      {rows.length ? (
        <ol className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <strong className="mr-2 text-slate-400">{index + 1}</strong>
                {row.name}
                <small className="ml-2 text-slate-500">{row.sku}</small>
              </span>
              <span className="font-semibold">
                {formatDecimalPtBr(row.quantity, 4)} {row.unitSymbol}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <Empty />
      )}
    </article>
  );
}

function Empty() {
  return <p className="mt-4 text-sm text-slate-500">Sem dados no período selecionado.</p>;
}
function DashboardSkeleton() {
  return (
    <div
      aria-label="Carregando indicadores"
      className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="h-28 rounded-xl bg-slate-200" />
      ))}
    </div>
  );
}
