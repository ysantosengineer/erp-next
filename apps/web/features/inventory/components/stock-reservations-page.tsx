'use client';

import { ExternalLink, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { Pagination } from '../../../components/shared/pagination';
import { Badge } from '../../../components/ui/badge';
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
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { formatDecimalPtBr } from '../../../lib/decimal';
import { useInventoryOptions, useStockReservations } from '../hooks/use-inventory';
import type { ReservationParams, StockReservationStatus } from '../types/inventory.types';

const statusLabels: Record<StockReservationStatus, string> = {
  ACTIVE: 'Ativa',
  RELEASED: 'Liberada',
  CONSUMED: 'Consumida',
};

export function StockReservationsPage() {
  const [page, setPage] = useState(1);
  const [salesOrderId, setSalesOrderId] = useState('');
  const [productId, setProductId] = useState('all');
  const [warehouseId, setWarehouseId] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [status, setStatus] = useState('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const options = useInventoryOptions();
  const warehouses = useMemo(
    () =>
      Array.from(
        new Map(
          (options.data?.locations ?? []).map((location) => [
            location.warehouse.id,
            location.warehouse,
          ]),
        ).values(),
      ),
    [options.data?.locations],
  );
  const params: ReservationParams = {
    page,
    limit: 20,
    ...(salesOrderId.trim() ? { salesOrderId: salesOrderId.trim() } : {}),
    ...(productId !== 'all' ? { productId } : {}),
    ...(warehouseId !== 'all' ? { warehouseId } : {}),
    ...(locationId !== 'all' ? { locationId } : {}),
    ...(status !== 'all' ? { status: status as StockReservationStatus } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };
  const query = useStockReservations(params);
  const resetPage = () => setPage(1);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Estoque"
        title="Reservas de estoque"
        description="Acompanhe o estoque comprometido por pedido e endereço físico."
      />
      <section
        aria-label="Filtros de reservas"
        className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Filtrar pelo identificador do pedido"
            className="pl-9"
            placeholder="ID exato do pedido"
            value={salesOrderId}
            onChange={(event) => {
              setSalesOrderId(event.target.value);
              resetPage();
            }}
          />
        </div>
        <FilterSelect
          label="Filtrar por produto"
          value={productId}
          onChange={(value) => {
            setProductId(value);
            resetPage();
          }}
        >
          <SelectItem value="all">Todos os produtos</SelectItem>
          {options.data?.products.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.sku} · {product.name}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Filtrar por depósito"
          value={warehouseId}
          onChange={(value) => {
            setWarehouseId(value);
            setLocationId('all');
            resetPage();
          }}
        >
          <SelectItem value="all">Todos os depósitos</SelectItem>
          {warehouses.map((warehouse) => (
            <SelectItem key={warehouse.id} value={warehouse.id}>
              {warehouse.code} · {warehouse.name}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Filtrar por endereço"
          value={locationId}
          onChange={(value) => {
            setLocationId(value);
            resetPage();
          }}
        >
          <SelectItem value="all">Todos os endereços</SelectItem>
          {options.data?.locations
            .filter((location) => warehouseId === 'all' || location.warehouse.id === warehouseId)
            .map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.warehouse.code} · {location.code}
              </SelectItem>
            ))}
        </FilterSelect>
        <FilterSelect
          label="Filtrar por status"
          value={status}
          onChange={(value) => {
            setStatus(value);
            resetPage();
          }}
        >
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="ACTIVE">Ativas</SelectItem>
          <SelectItem value="RELEASED">Liberadas</SelectItem>
          <SelectItem value="CONSUMED">Consumidas</SelectItem>
        </FilterSelect>
        <Input
          aria-label="Data inicial"
          type="date"
          value={startDate}
          onChange={(event) => {
            setStartDate(event.target.value);
            resetPage();
          }}
        />
        <Input
          aria-label="Data final"
          type="date"
          value={endDate}
          onChange={(event) => {
            setEndDate(event.target.value);
            resetPage();
          }}
        />
      </section>
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {query.isLoading ? (
          <div className="space-y-3 p-5" data-testid="reservations-loading">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton className="h-12" key={index} />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Não foi possível carregar as reservas.')}
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.data.length ? (
          <EmptyState
            title="Nenhuma reserva encontrada"
            description="Revise os filtros ou reserve um pedido confirmado."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Depósito</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.data.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">{reservation.salesOrder.number}</TableCell>
                      <TableCell>
                        <p>{reservation.product.name}</p>
                        <p className="text-xs text-slate-500">{reservation.product.sku}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatDecimalPtBr(reservation.quantity, 4)}{' '}
                        {reservation.product.unitSymbol}
                      </TableCell>
                      <TableCell>{reservation.location.warehouse.name}</TableCell>
                      <TableCell>{reservation.location.code}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            reservation.status === 'ACTIVE'
                              ? 'default'
                              : reservation.status === 'CONSUMED'
                                ? 'success'
                                : 'muted'
                          }
                        >
                          {statusLabels[reservation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.createdAt).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Link
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
                          href={`/sales/orders/${reservation.salesOrder.id}`}
                        >
                          Abrir <ExternalLink className="size-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              itemLabel="reservas"
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

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
