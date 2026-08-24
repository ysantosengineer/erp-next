'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePermission } from '../../../components/navigation/can';
import { EmptyState, ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { Pagination } from '../../../components/shared/pagination';
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
import { useWarehouses } from '../hooks/use-warehouses';
import type { ListWarehousesParams, StatusFilter } from '../types/warehouse.types';
import { WarehouseFormDialog } from './warehouse-form-dialog';
import { WarehousesTable } from './warehouses-table';

export function WarehousesPage() {
  const canCreate = usePermission(PERMISSIONS.WAREHOUSES_CREATE);
  const canUpdate = usePermission(PERMISSIONS.WAREHOUSES_UPDATE);
  const canStatus = usePermission(PERMISSIONS.WAREHOUSES_MANAGE_STATUS);
  const canReadLocations = usePermission(PERMISSIONS.STOCK_LOCATIONS_READ);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | StatusFilter>('all');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search.trim());
  const params = useMemo<ListWarehousesParams>(
    () => ({
      page,
      limit: 20,
      ...(debounced ? { search: debounced } : {}),
      ...(status !== 'all' ? { status } : {}),
      sortBy: 'name',
      sortOrder: 'asc',
    }),
    [debounced, page, status],
  );
  const query = useWarehouses(params);
  const result = query.data;
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Estoque"
        title="Depósitos"
        description="Organize os espaços físicos de armazenamento e seus endereços."
        action={canCreate ? <WarehouseFormDialog /> : undefined}
      />
      <section
        aria-label="Filtros de depósitos"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px]"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            type="search"
            aria-label="Pesquisar depósitos"
            placeholder="Nome ou código"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
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
          <div className="space-y-3 p-5" data-testid="warehouses-loading">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Não foi possível carregar os depósitos.')}
            onRetry={() => void query.refetch()}
          />
        ) : !result?.data.length ? (
          <EmptyState
            title="Nenhum depósito encontrado"
            description="Revise os filtros ou cadastre o primeiro depósito."
          />
        ) : (
          <>
            <WarehousesTable
              warehouses={result.data}
              canUpdate={canUpdate}
              canManageStatus={canStatus}
              canReadLocations={canReadLocations}
            />
            <Pagination
              itemLabel="depósitos"
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
