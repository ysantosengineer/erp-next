'use client';

import { useState } from 'react';
import { ErrorState, EmptyState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatCurrency } from '../../../lib/decimal';
import { useCashFlow } from '../hooks/use-finance';

const currentMonth = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const end = new Date(last.getTime() - last.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  return {
    startDate: `${local.slice(0, 7)}-01`,
    endDate: end,
    view: 'combined' as const,
    groupBy: 'day' as const,
  };
};

export function CashFlowPage() {
  const [filters, setFilters] = useState<{
    startDate: string;
    endDate: string;
    view: 'forecast' | 'realized' | 'combined';
    groupBy: 'day' | 'month';
  }>(currentMonth);
  const query = useCashFlow(filters);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Fluxo de caixa"
        description="Compare valores previstos por vencimento com pagamentos e recebimentos efetivamente realizados."
      />
      <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-4">
        <Input
          aria-label="Data inicial"
          type="date"
          value={filters.startDate}
          onChange={(event) => setFilters((value) => ({ ...value, startDate: event.target.value }))}
        />
        <Input
          aria-label="Data final"
          type="date"
          value={filters.endDate}
          onChange={(event) => setFilters((value) => ({ ...value, endDate: event.target.value }))}
        />
        <Select
          value={filters.view}
          onValueChange={(view: 'forecast' | 'realized' | 'combined') =>
            setFilters((value) => ({ ...value, view }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="combined">Previsto e realizado</SelectItem>
            <SelectItem value="forecast">Somente previsto</SelectItem>
            <SelectItem value="realized">Somente realizado</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.groupBy}
          onValueChange={(groupBy: 'day' | 'month') =>
            setFilters((value) => ({ ...value, groupBy }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Por dia</SelectItem>
            <SelectItem value="month">Por mês</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {query.isLoading ? (
        <Skeleton className="h-80" />
      ) : query.isError ? (
        <ErrorState
          message="Não foi possível calcular o fluxo de caixa."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data?.data.length ? (
        <EmptyState
          title="Sem movimentos no período"
          description="Altere o intervalo ou cadastre títulos e liquidações."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Receitas previstas</TableHead>
                <TableHead>Despesas previstas</TableHead>
                <TableHead>Saldo previsto</TableHead>
                <TableHead>Recebido</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Saldo realizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.data.map((row) => (
                <TableRow key={row.date}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{formatCurrency(row.forecast.receivables)}</TableCell>
                  <TableCell>{formatCurrency(row.forecast.payables)}</TableCell>
                  <TableCell>{formatCurrency(row.forecast.net)}</TableCell>
                  <TableCell>{formatCurrency(row.realized.receivables)}</TableCell>
                  <TableCell>{formatCurrency(row.realized.payables)}</TableCell>
                  <TableCell>{formatCurrency(row.realized.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
