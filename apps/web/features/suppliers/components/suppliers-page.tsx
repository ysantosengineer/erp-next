'use client';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { usePermission } from '../../../components/navigation/can';
import { useSuppliers } from '../hooks/use-suppliers';
import type {
  ListSuppliersParams,
  SupplierStatusFilter,
  SupplierType,
} from '../types/supplier.types';
import { SupplierFormDialog } from './supplier-form-dialog';
import { SuppliersTable } from './suppliers-table';
const PAGE_SIZE = 20;
export function SuppliersPage() {
  const canCreate = usePermission(PERMISSIONS.SUPPLIERS_CREATE),
    canUpdate = usePermission(PERMISSIONS.SUPPLIERS_UPDATE),
    canStatus = usePermission(PERMISSIONS.SUPPLIERS_MANAGE_STATUS);
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState<'all' | SupplierStatusFilter>('all'),
    [type, setType] = useState<'all' | SupplierType>('all'),
    [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search.trim());
  const params = useMemo<ListSuppliersParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(debounced ? { search: debounced } : {}),
      ...(status !== 'all' ? { status } : {}),
      ...(type !== 'all' ? { type } : {}),
      sortBy: 'name',
      sortOrder: 'asc',
    }),
    [debounced, page, status, type],
  );
  const suppliers = useSuppliers(params),
    result = suppliers.data;
  return (
    <div className="space-y-7">
      <PageHeader
        action={canCreate ? <SupplierFormDialog /> : undefined}
        description="Mantenha pessoas físicas e jurídicas que abastecem a operação da empresa."
        eyebrow="Cadastros"
        title="Fornecedores"
      />
      <section
        aria-label="Filtros de fornecedores"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_220px_220px]"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Pesquisar fornecedores"
            className="pl-9"
            type="search"
            placeholder="Nome, documento ou e-mail"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as typeof status);
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
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v as typeof type);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filtrar por tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="INDIVIDUAL">Pessoa Física</SelectItem>
            <SelectItem value="COMPANY">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {suppliers.isLoading ? (
          <div className="space-y-3 p-5" data-testid="suppliers-loading">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton className="h-12 w-full" key={i} />
            ))}
          </div>
        ) : suppliers.isError ? (
          <ErrorState
            message={getApiErrorMessage(
              suppliers.error,
              'Não foi possível carregar os fornecedores.',
            )}
            onRetry={() => void suppliers.refetch()}
          />
        ) : !result || !result.data.length ? (
          <EmptyState
            title="Nenhum fornecedor encontrado"
            description="Revise os filtros ou cadastre o primeiro fornecedor."
          />
        ) : (
          <>
            <SuppliersTable
              suppliers={result.data}
              canUpdate={canUpdate}
              canManageStatus={canStatus}
            />
            <Pagination
              itemLabel="fornecedores"
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
