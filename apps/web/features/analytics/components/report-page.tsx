'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatCurrency, formatDecimalPtBr } from '../../../lib/decimal';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { useAnalyticsReport } from '../hooks/use-analytics';
import type {
  FinanceReportRow,
  InventoryReportRow,
  PurchaseReportRow,
  ReportFilters,
  ReportResponse,
  SalesReportRow,
} from '../types/analytics.types';
import { PeriodFilter } from './period-filter';

type Kind = 'sales' | 'purchases' | 'inventory' | 'finance';
const settings = {
  sales: {
    title: 'Relatório de vendas',
    description:
      'Pedidos confirmados, reservados ou expedidos. Valores não representam faturamento fiscal.',
    sortBy: 'orderDate',
  },
  purchases: {
    title: 'Relatório de compras',
    description: 'Pedidos emitidos no período e progresso financeiro dos recebimentos.',
    sortBy: 'createdAt',
  },
  inventory: {
    title: 'Relatório de estoque',
    description: 'Posição atual por produto e endereço. Quantidades permanecem em sua unidade.',
    sortBy: 'productName',
  },
  finance: {
    title: 'Relatório financeiro',
    description: 'Títulos com vencimento no período e respectivos saldos.',
    sortBy: 'dueDate',
  },
} as const;

const endDate = new Date().toISOString().slice(0, 10);
const start = new Date();
start.setDate(start.getDate() - 29);
const startDate = start.toISOString().slice(0, 10);

export function ReportPage({ kind }: Readonly<{ kind: Kind }>) {
  const config = settings[kind];
  const [filters, setFilters] = useState<ReportFilters>({
    startDate,
    endDate,
    page: 1,
    limit: 20,
    search: '',
    sortBy: config.sortBy,
    sortOrder: 'desc',
  });
  const debouncedSearch = useDebouncedValue(filters.search ?? '', 300);
  const query = useAnalyticsReport(kind, { ...filters, search: debouncedSearch });
  const meta = query.data?.meta;
  return (
    <div className="space-y-6">
      <header>
        <Link href="/reports" className="text-sm font-semibold text-blue-700">
          ← Relatórios
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{config.title}</h1>
        <p className="mt-2 text-slate-600">{config.description}</p>
      </header>
      <PeriodFilter
        startDate={filters.startDate}
        endDate={filters.endDate}
        onChange={(period) => setFilters((current) => ({ ...current, ...period, page: 1 }))}
      />
      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="min-w-64 flex-1 text-sm font-medium text-slate-700">
          Pesquisar
          <Input
            className="mt-1"
            placeholder="Número ou parceiro"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))
            }
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Ordem
          <select
            className="mt-1 block h-10 rounded-lg border border-slate-300 bg-white px-3"
            value={filters.sortOrder}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                sortOrder: event.target.value as 'asc' | 'desc',
                page: 1,
              }))
            }
          >
            <option value="desc">Mais recentes/maiores</option>
            <option value="asc">Mais antigos/menores</option>
          </select>
        </label>
      </div>
      {query.isLoading ? (
        <div
          className="h-64 animate-pulse rounded-xl bg-slate-200"
          aria-label="Carregando relatório"
        />
      ) : null}
      {query.isError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          Não foi possível carregar o relatório.
        </p>
      ) : null}
      {query.data ? <ReportTable kind={kind} response={query.data} /> : null}
      {meta ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            {meta.total} registro(s) · página {meta.page} de {Math.max(meta.totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={meta.page <= 1}
              onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReportTable({
  kind,
  response,
}: Readonly<{
  kind: Kind;
  response:
    | ReportResponse<SalesReportRow>
    | ReportResponse<PurchaseReportRow>
    | ReportResponse<InventoryReportRow>
    | ReportResponse<FinanceReportRow>;
}>) {
  if (!response.data.length)
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Nenhum dado encontrado para os filtros.
      </p>
    );
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      {kind === 'sales' ? (
        <SalesTable rows={(response as ReportResponse<SalesReportRow>).data} />
      ) : null}
      {kind === 'purchases' ? (
        <PurchasesTable rows={(response as ReportResponse<PurchaseReportRow>).data} />
      ) : null}
      {kind === 'inventory' ? (
        <InventoryTable rows={(response as ReportResponse<InventoryReportRow>).data} />
      ) : null}
      {kind === 'finance' ? (
        <FinanceTable rows={(response as ReportResponse<FinanceReportRow>).data} />
      ) : null}
    </div>
  );
}

function SalesTable({ rows }: Readonly<{ rows: SalesReportRow[] }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pedido</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Link className="font-semibold text-blue-700" href={`/sales/orders/${row.id}`}>
                {row.number}
              </Link>
            </TableCell>
            <TableCell>
              {new Date(`${row.orderDate}T00:00:00`).toLocaleDateString('pt-BR')}
            </TableCell>
            <TableCell>{row.customer.name}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.totalAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
function PurchasesTable({ rows }: Readonly<{ rows: PurchaseReportRow[] }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pedido</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Pendências</TableHead>
          <TableHead className="text-right">Pedido</TableHead>
          <TableHead className="text-right">Recebido</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Link className="font-semibold text-blue-700" href={`/purchases/orders/${row.id}`}>
                {row.number}
              </Link>
            </TableCell>
            <TableCell>{row.supplier.name}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell>{row.pendingItemsCount}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.totalAmount)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.receivedAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
function InventoryTable({ rows }: Readonly<{ rows: InventoryReportRow[] }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Endereço</TableHead>
          <TableHead className="text-right">Físico</TableHead>
          <TableHead className="text-right">Reservado</TableHead>
          <TableHead className="text-right">Disponível</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.productId}-${row.locationCode ?? 'none'}`}>
            <TableCell>
              <span className="font-medium text-slate-950">{row.productName}</span>
              <small className="ml-2 text-slate-500">{row.sku}</small>
            </TableCell>
            <TableCell>
              {row.warehouseName
                ? `${row.warehouseName} · ${row.locationCode}`
                : 'Sem saldo/endereço'}
            </TableCell>
            <TableCell className="text-right">
              {formatDecimalPtBr(row.physical, 4)} {row.unitSymbol}
            </TableCell>
            <TableCell className="text-right">
              {formatDecimalPtBr(row.reserved, 4)} {row.unitSymbol}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {formatDecimalPtBr(row.available, 4)} {row.unitSymbol}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
function FinanceTable({ rows }: Readonly<{ rows: FinanceReportRow[] }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Original</TableHead>
          <TableHead className="text-right">Pendente</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Link className="font-semibold text-blue-700" href={`/finance/entries/${row.id}`}>
                {row.number}
              </Link>
            </TableCell>
            <TableCell>{row.description}</TableCell>
            <TableCell>{row.type === 'PAYABLE' ? 'A pagar' : 'A receber'}</TableCell>
            <TableCell>
              {row.overdue ? `Vencido há ${row.daysOverdue} dia(s)` : row.status}
            </TableCell>
            <TableCell className="text-right">{formatCurrency(row.originalAmount)}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.remainingAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
