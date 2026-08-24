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
import { useCustomers } from '../hooks/use-customers';
import type {
  CustomerStatusFilter,
  CustomerType,
  ListCustomersParams,
} from '../types/customer.types';
import { CustomerFormDialog } from './customer-form-dialog';
import { CustomersTable } from './customers-table';

const PAGE_SIZE = 20;

export function CustomersPage() {
  const canCreate = usePermission(PERMISSIONS.CUSTOMERS_CREATE);
  const canUpdate = usePermission(PERMISSIONS.CUSTOMERS_UPDATE);
  const canStatus = usePermission(PERMISSIONS.CUSTOMERS_MANAGE_STATUS);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | CustomerStatusFilter>('all');
  const [type, setType] = useState<'all' | CustomerType>('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());
  const params = useMemo<ListCustomersParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(status !== 'all' ? { status } : {}),
      ...(type !== 'all' ? { type } : {}),
      sortBy: 'name',
      sortOrder: 'asc',
    }),
    [debouncedSearch, page, status, type],
  );
  const customers = useCustomers(params);
  const result = customers.data;

  return (
    <div className="space-y-7">
      <PageHeader
        action={canCreate ? <CustomerFormDialog /> : undefined}
        description="Gerencie pessoas físicas e jurídicas, contatos e limites de crédito."
        eyebrow="Cadastros"
        title="Clientes"
      />
      <section
        aria-label="Filtros de clientes"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_220px_220px]"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Pesquisar clientes"
            className="pl-9"
            type="search"
            placeholder="Nome, documento, e-mail ou telefone"
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
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value as typeof type);
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
        {customers.isLoading ? (
          <div className="space-y-3 p-5" data-testid="customers-loading">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        ) : customers.isError ? (
          <ErrorState
            message={getApiErrorMessage(customers.error, 'Não foi possível carregar os clientes.')}
            onRetry={() => void customers.refetch()}
          />
        ) : !result || !result.data.length ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Revise os filtros ou cadastre o primeiro cliente."
          />
        ) : (
          <>
            <CustomersTable
              customers={result.data}
              canUpdate={canUpdate}
              canManageStatus={canStatus}
            />
            <Pagination
              itemLabel="clientes"
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
