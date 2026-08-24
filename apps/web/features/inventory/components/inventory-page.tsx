'use client';

import { History, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePermission } from '../../../components/navigation/can';
import { EmptyState, ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { Pagination } from '../../../components/shared/pagination';
import { Badge } from '../../../components/ui/badge';
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
import { useBalances, useInventoryOptions } from '../hooks/use-inventory';
import type { BalanceParams } from '../types/inventory.types';
import { MovementFormDialog } from './movement-form-dialog';

const toScaledQuantity = (value: string) => {
  const [integer, fraction = ''] = value.split('.');
  return BigInt(integer) * 10_000n + BigInt(fraction.padEnd(4, '0').slice(0, 4));
};

export function InventoryPage() {
  const canEntry = usePermission(PERMISSIONS.INVENTORY_ENTRY);
  const canExit = usePermission(PERMISSIONS.INVENTORY_EXIT);
  const canAdjust = usePermission(PERMISSIONS.INVENTORY_ADJUST);
  const canTransfer = usePermission(PERMISSIONS.INVENTORY_TRANSFER);
  const canHistory = usePermission(PERMISSIONS.INVENTORY_MOVEMENTS_READ);
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search.trim());
  const params = useMemo<BalanceParams>(
    () => ({
      page,
      limit: 20,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      ...(debounced ? { search: debounced } : {}),
      ...(productId !== 'all' ? { productId } : {}),
      ...(locationId !== 'all' ? { locationId } : {}),
    }),
    [debounced, locationId, page, productId],
  );
  const query = useBalances(params);
  const options = useInventoryOptions();
  const actions = (
    <div className="flex flex-wrap gap-2">
      {canHistory ? (
        <Button asChild variant="outline">
          <Link href="/inventory/movements">
            <History className="size-4" />
            Histórico
          </Link>
        </Button>
      ) : null}
      {canEntry ? <MovementFormDialog action="entry" /> : null}
      {canExit ? <MovementFormDialog action="exit" /> : null}
      {canAdjust ? <MovementFormDialog action="adjustment" /> : null}
      {canTransfer ? <MovementFormDialog action="transfer" /> : null}
    </div>
  );
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Estoque"
        title="Saldos de estoque"
        description="Consulte estoque físico, reservado e disponível por endereço."
        action={actions}
      />
      <section
        aria-label="Filtros de saldos"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_280px_280px]"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            type="search"
            aria-label="Pesquisar saldos"
            placeholder="Produto, SKU ou endereço"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={productId}
          onValueChange={(value) => {
            setProductId(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filtrar por produto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {options.data?.products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.sku} · {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={locationId}
          onValueChange={(value) => {
            setLocationId(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filtrar por endereço">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os endereços</SelectItem>
            {options.data?.locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.warehouse.code} · {location.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {query.isLoading ? (
          <div className="space-y-3 p-5" data-testid="inventory-loading">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Não foi possível carregar os saldos.')}
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.data.length ? (
          <EmptyState
            title="Nenhum saldo encontrado"
            description="Registre uma entrada ou revise os filtros."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Depósito</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-right">Físico</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead className="text-right">Disponível</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.data.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell>
                        <p className="font-medium text-slate-950">{balance.product.name}</p>
                        <p className="text-xs text-slate-500">{balance.product.sku}</p>
                      </TableCell>
                      <TableCell>{balance.location.warehouse.name}</TableCell>
                      <TableCell>{balance.location.code}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {balance.quantity} {balance.product.unit.symbol}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {balance.reservedQuantity} {balance.product.unit.symbol}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {balance.availableQuantity} {balance.product.unit.symbol}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {balance.product.minimumStock} {balance.product.unit.symbol}
                      </TableCell>
                      <TableCell>
                        {!balance.product.isActive ? (
                          <Badge variant="muted">Produto inativo</Badge>
                        ) : toScaledQuantity(balance.availableQuantity) <
                          toScaledQuantity(balance.product.minimumStock) ? (
                          <Badge variant="warning">Estoque baixo</Badge>
                        ) : (
                          <Badge variant="success">Regular</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Intl.DateTimeFormat('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(balance.updatedAt))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              itemLabel="saldos"
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
