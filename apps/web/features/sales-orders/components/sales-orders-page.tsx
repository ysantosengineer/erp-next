'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
import { useSalesOrderOptions, useSalesOrders } from '../hooks/use-sales-orders';
import type { SalesOrderFilters, SalesOrderStatus as Status } from '../types/sales-order.types';
import { SalesOrderStatus } from './sales-order-status';

const initial: SalesOrderFilters = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export function SalesOrdersPage() {
  const [filters, setFilters] = useState(initial);
  const { user } = useAuth();
  const query = useSalesOrders(filters);
  const options = useSalesOrderOptions();
  const set = (patch: Partial<SalesOrderFilters>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendas"
        title="Pedidos de venda"
        description="Registre pedidos e acompanhe confirmação, reserva e expedição."
        action={
          user?.permissions.includes(PERMISSIONS.SALES_ORDERS_CREATE) ? (
            <Button asChild>
              <Link href="/sales/orders/new">
                <Plus className="size-4" /> Novo pedido
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <Input
          aria-label="Pesquisar pedidos"
          placeholder="Pedido, cliente ou produto"
          value={filters.search ?? ''}
          onChange={(event) => set({ search: event.target.value || undefined })}
        />
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(value) =>
            set({ status: value === 'all' ? undefined : (value as Status) })
          }
        >
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(['DRAFT', 'CONFIRMED', 'CANCELLED'] as Status[]).map((status) => (
              <SelectItem key={status} value={status}>
                <SalesOrderStatus status={status} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.customerId ?? 'all'}
          onValueChange={(value) => set({ customerId: value === 'all' ? undefined : value })}
        >
          <SelectTrigger aria-label="Cliente">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {options.data?.customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.warehouseId ?? 'all'}
          onValueChange={(value) => set({ warehouseId: value === 'all' ? undefined : value })}
        >
          <SelectTrigger aria-label="Depósito">
            <SelectValue placeholder="Depósito" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os depósitos</SelectItem>
            {options.data?.warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          aria-label="Data inicial"
          type="date"
          value={filters.startDate ?? ''}
          onChange={(event) => set({ startDate: event.target.value || undefined })}
        />
        <Input
          aria-label="Data final"
          type="date"
          value={filters.endDate ?? ''}
          onChange={(event) => set({ endDate: event.target.value || undefined })}
        />
      </div>
      {query.isLoading ? (
        <Skeleton className="h-80" />
      ) : query.isError ? (
        <ErrorState
          message="Não foi possível carregar os pedidos."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data?.data.length ? (
        <EmptyState
          title="Nenhum pedido encontrado"
          description="Crie um pedido ou ajuste os filtros."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">{order.number}</TableCell>
                    <TableCell>{order.customer.name}</TableCell>
                    <TableCell>{order.warehouse.name}</TableCell>
                    <TableCell>
                      {new Date(`${order.orderDate}T00:00:00`).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {order.expectedDeliveryDate
                        ? new Date(`${order.expectedDeliveryDate}T00:00:00`).toLocaleDateString(
                            'pt-BR',
                          )
                        : '—'}
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>
                      <SalesOrderStatus status={order.status} />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/sales/orders/${order.id}`}>Detalhes</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            itemLabel="pedidos"
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
