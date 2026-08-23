'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePermission } from '../../../components/navigation/can';
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
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { useWarehouses } from '../../warehouses/hooks/use-warehouses';
import { useInventoryCounts } from '../hooks/use-inventory-counts';
import type {
  InventoryCountListParams,
  InventoryCountStatus,
} from '../types/inventory-count.types';
import { CreateInventoryCountDialog } from './create-inventory-count-dialog';
import { InventoryCountStatusBadge, inventoryCountStatusLabels } from './inventory-count-status';

const statuses = Object.keys(inventoryCountStatusLabels) as InventoryCountStatus[];
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );

export function InventoryCountsPage() {
  const canCreate = usePermission(PERMISSIONS.INVENTORY_COUNTS_CREATE);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search.trim());
  const params = useMemo<InventoryCountListParams>(
    () => ({
      page,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...(debounced ? { search: debounced } : {}),
      ...(warehouseId !== 'all' ? { warehouseId } : {}),
      ...(status !== 'all' ? { status: status as InventoryCountStatus } : {}),
    }),
    [debounced, page, status, warehouseId],
  );
  const query = useInventoryCounts(params);
  const warehouses = useWarehouses({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Estoque"
        title="Inventários físicos"
        description="Conte mercadorias, trate divergências e aprove ajustes com rastreabilidade."
        action={canCreate ? <CreateInventoryCountDialog /> : undefined}
      />
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_260px_240px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Pesquisar inventários"
            className="pl-9"
            placeholder="Descrição, depósito ou código"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={warehouseId}
          onValueChange={(value) => {
            setWarehouseId(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filtrar por depósito">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os depósitos</SelectItem>
            {warehouses.data?.data.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.code} · {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statuses.map((value) => (
              <SelectItem key={value} value={value}>
                {inventoryCountStatusLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {query.isLoading ? (
          <div className="space-y-3 p-5" data-testid="inventory-counts-loading">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-12" key={index} />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Não foi possível carregar os inventários.')}
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.data.length ? (
          <EmptyState
            title="Nenhum inventário encontrado"
            description={
              canCreate
                ? 'Crie um inventário para iniciar uma contagem física.'
                : 'Revise os filtros aplicados.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Depósito</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.data.map((count) => {
                    const progress = count.summary.totalItems
                      ? Math.round((count.summary.countedItems / count.summary.totalItems) * 100)
                      : 0;
                    return (
                      <TableRow key={count.id}>
                        <TableCell>
                          <p className="font-medium text-slate-950">{count.warehouse.name}</p>
                          <p className="text-xs text-slate-500">{count.warehouse.code}</p>
                        </TableCell>
                        <TableCell>
                          <InventoryCountStatusBadge status={count.status} />
                        </TableCell>
                        <TableCell>{count.createdBy.name}</TableCell>
                        <TableCell>
                          <p className="font-medium tabular-nums">
                            {count.summary.countedItems}/{count.summary.totalItems} · {progress}%
                          </p>
                          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(count.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/inventory/counts/${count.id}`}>Abrir</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Pagination
              itemLabel="inventários"
              onPageChange={setPage}
              page={query.data.meta.page}
              pageSize={query.data.meta.limit}
              total={query.data.meta.total}
              totalPages={query.data.meta.totalPages}
            />
          </>
        )}
      </section>
    </div>
  );
}
