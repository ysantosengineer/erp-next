'use client';

import { ArrowLeft, Search } from 'lucide-react';
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
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { useStockLocations } from '../hooks/use-stock-locations';
import type { ListStockLocationsParams } from '../types/stock-location.types';
import type { StatusFilter } from '../../warehouses/types/warehouse.types';
import { StockLocationFormDialog } from './stock-location-form-dialog';
import { StockLocationsTable } from './stock-locations-table';

export function StockLocationsPage({ warehouseId }: Readonly<{ warehouseId: string }>) {
  const canCreate = usePermission(PERMISSIONS.STOCK_LOCATIONS_CREATE);
  const canUpdate = usePermission(PERMISSIONS.STOCK_LOCATIONS_UPDATE);
  const canStatus = usePermission(PERMISSIONS.STOCK_LOCATIONS_MANAGE_STATUS);
  const [search, setSearch] = useState('');
  const [zone, setZone] = useState('');
  const [status, setStatus] = useState<'all' | StatusFilter>('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());
  const debouncedZone = useDebouncedValue(zone.trim());
  const params = useMemo<ListStockLocationsParams>(
    () => ({
      page,
      limit: 20,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(debouncedZone ? { zone: debouncedZone.toUpperCase() } : {}),
      ...(status !== 'all' ? { status } : {}),
      sortBy: 'code',
      sortOrder: 'asc',
    }),
    [debouncedSearch, debouncedZone, page, status],
  );
  const query = useStockLocations(warehouseId, params);
  const result = query.data;
  return (
    <div className="space-y-7">
      <Button asChild size="sm" variant="ghost">
        <Link href="/warehouses">
          <ArrowLeft className="size-4" />
          Voltar para depósitos
        </Link>
      </Button>
      <PageHeader
        eyebrow="Estoque"
        title={
          result ? `${result.warehouse.name} · ${result.warehouse.code}` : 'Endereços de estoque'
        }
        description="Organize zonas, corredores, prateleiras, níveis e posições do depósito."
        action={
          canCreate && result ? (
            <StockLocationFormDialog
              warehouseId={warehouseId}
              disabled={!result.warehouse.isActive}
            />
          ) : undefined
        }
      />
      {result && !result.warehouse.isActive ? (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Este depósito está inativo. Ative-o antes de criar ou reativar endereços.
        </p>
      ) : null}
      <section
        aria-label="Filtros de endereços"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_180px_220px]"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            type="search"
            aria-label="Pesquisar endereços"
            placeholder="Código ou descrição física"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Input
          aria-label="Filtrar por zona"
          placeholder="Zona"
          value={zone}
          onChange={(event) => {
            setZone(event.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as typeof status);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {query.isLoading ? (
          <div className="space-y-3 p-5" data-testid="locations-loading">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Não foi possível carregar os endereços.')}
            onRetry={() => void query.refetch()}
          />
        ) : !result?.data.length ? (
          <EmptyState
            title="Nenhum endereço encontrado"
            description="Revise os filtros ou cadastre o primeiro endereço deste depósito."
          />
        ) : (
          <>
            <StockLocationsTable
              warehouseId={warehouseId}
              locations={result.data}
              canUpdate={canUpdate}
              canManageStatus={canStatus}
            />
            <Pagination
              itemLabel="endereços"
              onPageChange={setPage}
              page={result.meta.page}
              pageSize={result.meta.limit}
              total={result.meta.total}
              totalPages={result.meta.totalPages}
            />
          </>
        )}
      </section>
    </div>
  );
}
