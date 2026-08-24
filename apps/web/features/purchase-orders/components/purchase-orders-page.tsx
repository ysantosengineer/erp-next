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
import { useAuth } from '../../auth/hooks/use-auth';
import { formatCurrency } from '../../../lib/decimal';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { usePurchaseOrderOptions, usePurchaseOrders } from '../hooks/use-purchase-orders';
import type {
  PurchaseOrderFilters,
  PurchaseOrderStatus as Status,
} from '../types/purchase-order.types';
import { PurchaseOrderStatus } from './purchase-order-status';

const initial: PurchaseOrderFilters = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};
export function PurchaseOrdersPage() {
  const [filters, setFilters] = useState(initial);
  const { user } = useAuth();
  const query = usePurchaseOrders(filters);
  const options = usePurchaseOrderOptions();
  const set = (patch: Partial<PurchaseOrderFilters>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }));
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compras"
        title="Pedidos de compra"
        description="Crie, aprove e acompanhe intenções de compra sem alterar o estoque."
        action={
          user?.permissions.includes(PERMISSIONS.PURCHASE_ORDERS_CREATE) ? (
            <Button asChild>
              <Link href="/purchases/orders/new">
                <Plus className="size-4" /> Novo pedido
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <Input
          aria-label="Pesquisar pedidos"
          placeholder="Pedido, fornecedor ou produto"
          value={filters.search ?? ''}
          onChange={(e) => set({ search: e.target.value || undefined })}
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
            {(
              [
                'DRAFT',
                'PENDING_APPROVAL',
                'APPROVED',
                'PARTIALLY_RECEIVED',
                'RECEIVED',
                'CANCELLED',
              ] as Status[]
            ).map((status) => (
              <SelectItem key={status} value={status}>
                <PurchaseOrderStatus status={status} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.supplierId ?? 'all'}
          onValueChange={(value) => set({ supplierId: value === 'all' ? undefined : value })}
        >
          <SelectTrigger aria-label="Fornecedor">
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {options.data?.suppliers.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
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
            {options.data?.warehouses.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          aria-label="Data inicial"
          type="date"
          value={filters.startDate ?? ''}
          onChange={(e) => set({ startDate: e.target.value || undefined })}
        />
        <Input
          aria-label="Data final"
          type="date"
          value={filters.endDate ?? ''}
          onChange={(e) => set({ endDate: e.target.value || undefined })}
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
                  <TableHead>Fornecedor</TableHead>
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
                    <TableCell>{order.supplier.name}</TableCell>
                    <TableCell>{order.warehouse.name}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      {order.expectedDeliveryDate
                        ? new Date(`${order.expectedDeliveryDate}T00:00:00`).toLocaleDateString(
                            'pt-BR',
                          )
                        : '—'}
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>
                      <PurchaseOrderStatus status={order.status} />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/purchases/orders/${order.id}`}>Detalhes</Link>
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
