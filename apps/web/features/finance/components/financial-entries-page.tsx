'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { Pagination } from '../../../components/shared/pagination';
import { Button } from '../../../components/ui/button';
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
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { useAuth } from '../../auth/hooks/use-auth';
import { useFinanceSummary, useFinancialEntries } from '../hooks/use-finance';
import type {
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialFilters,
} from '../types/finance.types';
import { FinancialStatus } from './financial-status';

const localDate = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const monthStart = () => `${localDate().slice(0, 7)}-01`;

export function FinancialEntriesPage({ type }: { type: FinancialEntryType }) {
  const payable = type === 'PAYABLE';
  const [filters, setFilters] = useState<FinancialFilters>({
    page: 1,
    limit: 20,
    type,
    sortBy: 'dueDate',
    sortOrder: 'asc',
  });
  const { user } = useAuth();
  const query = useFinancialEntries(filters);
  const summary = useFinanceSummary(monthStart(), localDate());
  const set = (patch: Partial<FinancialFilters>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }));
  const cards = useMemo(
    () =>
      payable
        ? [
            ['Em aberto', summary.data?.totalPayableOpen],
            ['Vencido', summary.data?.overduePayables],
            ['Pago no mês', summary.data?.paidInPeriod],
          ]
        : [
            ['Em aberto', summary.data?.totalReceivableOpen],
            ['Vencido', summary.data?.overdueReceivables],
            ['Recebido no mês', summary.data?.receivedInPeriod],
          ],
    [payable, summary.data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title={payable ? 'Contas a pagar' : 'Contas a receber'}
        description={
          payable
            ? 'Acompanhe obrigações, vencimentos e pagamentos.'
            : 'Acompanhe direitos, vencimentos e recebimentos.'
        }
        action={
          user?.permissions.includes(PERMISSIONS.FINANCE_CREATE) ? (
            <Button asChild>
              <Link href={`/finance/${payable ? 'payables' : 'receivables'}/new`}>
                <Plus className="size-4" /> Novo título
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map(([label, value]) => (
          <div className="rounded-xl border bg-white p-4" key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(value ?? '0.00')}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-5">
        <Input
          aria-label="Pesquisar títulos"
          placeholder="Número, descrição ou documento"
          value={filters.search ?? ''}
          onChange={(event) => set({ search: event.target.value || undefined })}
        />
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(value) =>
            set({ status: value === 'all' ? undefined : (value as FinancialEntryStatus) })
          }
        >
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="OPEN">Em aberto</SelectItem>
            <SelectItem value="PARTIALLY_SETTLED">Parcial</SelectItem>
            <SelectItem value="SETTLED">Liquidado</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.overdue === undefined ? 'all' : String(filters.overdue)}
          onValueChange={(value) =>
            set({ overdue: value === 'all' ? undefined : value === 'true' })
          }
        >
          <SelectTrigger aria-label="Vencimento">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os vencimentos</SelectItem>
            <SelectItem value="true">Somente vencidos</SelectItem>
            <SelectItem value="false">Não vencidos</SelectItem>
          </SelectContent>
        </Select>
        <Input
          aria-label="Vencimento inicial"
          type="date"
          value={filters.startDueDate ?? ''}
          onChange={(event) => set({ startDueDate: event.target.value || undefined })}
        />
        <Input
          aria-label="Vencimento final"
          type="date"
          value={filters.endDueDate ?? ''}
          onChange={(event) => set({ endDueDate: event.target.value || undefined })}
        />
      </div>
      {query.isLoading ? (
        <Skeleton className="h-80" />
      ) : query.isError ? (
        <ErrorState
          message="Não foi possível carregar os títulos."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data?.data.length ? (
        <EmptyState
          title="Nenhum título encontrado"
          description="Crie um título ou ajuste os filtros."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <Table className="min-w-[850px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>{payable ? 'Fornecedor' : 'Cliente'}</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Pendente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono font-medium">{entry.number}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>
                      {entry.supplier?.name ?? entry.customer?.name ?? 'Sem vínculo'}
                    </TableCell>
                    <TableCell>
                      {new Date(`${entry.dueDate}T00:00:00`).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{formatCurrency(entry.originalAmount)}</TableCell>
                    <TableCell>{formatCurrency(entry.remainingAmount)}</TableCell>
                    <TableCell>
                      <FinancialStatus status={entry.status} overdue={entry.overdue} />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/finance/entries/${entry.id}`}>Detalhes</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            itemLabel="títulos"
            page={query.data.meta.page}
            pageSize={query.data.meta.limit}
            total={query.data.meta.total}
            totalPages={query.data.meta.totalPages}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </>
      )}
    </div>
  );
}
