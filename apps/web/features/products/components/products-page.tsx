'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePermission } from '../../../components/navigation/can';
import { EmptyState, ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { Pagination } from '../../../components/shared/pagination';
import { buttonVariants } from '../../../components/ui/button';
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
import { cn } from '../../../lib/utils';
import { useProductOptions, useProducts } from '../hooks/use-products';
import type {
  ListProductsParams,
  ProductSortField,
  ProductStatusFilter,
} from '../types/product.types';
import { ProductsTable } from './products-table';

const PAGE_SIZE = 20;

export function ProductsPage() {
  const canCreate = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const canUpdate = usePermission(PERMISSIONS.PRODUCTS_UPDATE);
  const canStatus = usePermission(PERMISSIONS.PRODUCTS_MANAGE_STATUS);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ProductStatusFilter>('all');
  const [categoryId, setCategoryId] = useState('all');
  const [unitId, setUnitId] = useState('all');
  const [supplierId, setSupplierId] = useState('all');
  const [sortBy, setSortBy] = useState<ProductSortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search.trim());
  const options = useProductOptions();
  const params = useMemo<ListProductsParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(debounced ? { search: debounced } : {}),
      ...(status !== 'all' ? { status } : {}),
      ...(categoryId !== 'all' ? { categoryId } : {}),
      ...(unitId !== 'all' ? { unitId } : {}),
      ...(supplierId !== 'all' ? { supplierId } : {}),
      sortBy,
      sortOrder,
    }),
    [categoryId, debounced, page, sortBy, sortOrder, status, supplierId, unitId],
  );
  const products = useProducts(params);
  const resetPage = () => setPage(1);

  return (
    <div className="space-y-7">
      <PageHeader
        action={
          canCreate ? (
            <Link className={cn(buttonVariants())} href="/products/new">
              <Plus className="size-4" /> Novo produto
            </Link>
          ) : undefined
        }
        description="Organize o catálogo comercial, preços e dados logísticos da empresa."
        eyebrow="Cadastros"
        title="Produtos"
      />
      <section
        aria-label="Filtros de produtos"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Pesquisar produtos"
            className="pl-9"
            placeholder="Nome, SKU, código de barras ou descrição"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
          />
        </div>
        <FilterSelect
          label="Filtrar por status"
          value={status}
          onChange={(value) => {
            setStatus(value as typeof status);
            resetPage();
          }}
          items={[
            ['all', 'Todos os status'],
            ['active', 'Ativos'],
            ['inactive', 'Inativos'],
          ]}
        />
        <FilterSelect
          label="Filtrar por categoria"
          value={categoryId}
          onChange={(value) => {
            setCategoryId(value);
            resetPage();
          }}
          items={[
            ['all', 'Todas as categorias'],
            ...(options.categories.data?.data.map(
              (item) => [item.id, item.name] as [string, string],
            ) ?? []),
          ]}
        />
        <FilterSelect
          label="Filtrar por unidade"
          value={unitId}
          onChange={(value) => {
            setUnitId(value);
            resetPage();
          }}
          items={[
            ['all', 'Todas as unidades'],
            ...(options.units.data?.data.map(
              (item) =>
                [item.id, `${item.name}${item.symbol ? ` (${item.symbol})` : ''}`] as [
                  string,
                  string,
                ],
            ) ?? []),
          ]}
        />
        <FilterSelect
          label="Filtrar por fornecedor"
          value={supplierId}
          onChange={(value) => {
            setSupplierId(value);
            resetPage();
          }}
          items={[
            ['all', 'Todos os fornecedores'],
            ...(options.suppliers.data?.data.map(
              (item) => [item.id, item.name] as [string, string],
            ) ?? []),
          ]}
        />
        <FilterSelect
          label="Ordenar produtos"
          value={sortBy}
          onChange={(value) => {
            setSortBy(value as ProductSortField);
            resetPage();
          }}
          items={[
            ['name', 'Nome'],
            ['sku', 'SKU'],
            ['costPrice', 'Preço de custo'],
            ['salePrice', 'Preço de venda'],
            ['createdAt', 'Data de criação'],
            ['updatedAt', 'Última atualização'],
          ]}
        />
        <FilterSelect
          label="Direção da ordenação"
          value={sortOrder}
          onChange={(value) => {
            setSortOrder(value as 'asc' | 'desc');
            resetPage();
          }}
          items={[
            ['asc', 'Crescente'],
            ['desc', 'Decrescente'],
          ]}
        />
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {products.isLoading ? (
          <div className="space-y-3 p-5" data-testid="products-loading">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        ) : products.isError ? (
          <ErrorState
            message={getApiErrorMessage(products.error, 'Não foi possível carregar os produtos.')}
            onRetry={() => void products.refetch()}
          />
        ) : !products.data?.data.length ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Revise os filtros ou cadastre o primeiro produto."
          />
        ) : (
          <>
            <ProductsTable
              products={products.data.data}
              canUpdate={canUpdate}
              canManageStatus={canStatus}
            />
            <Pagination
              itemLabel="produtos"
              onPageChange={setPage}
              page={products.data.meta.page}
              pageSize={products.data.meta.limit}
              total={products.data.meta.total}
              totalPages={products.data.meta.totalPages}
            />
          </>
        )}
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  items,
}: Readonly<{
  label: string;
  value: string;
  onChange(value: string): void;
  items: [string, string][];
}>) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map(([itemValue, text]) => (
          <SelectItem key={itemValue} value={itemValue}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
