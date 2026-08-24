'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
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
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { useInventoryOptions, useMovements } from '../hooks/use-inventory';
import type { MovementParams, MovementType } from '../types/inventory.types';

const labels: Record<MovementType, string> = {
  ENTRY: 'Entrada',
  EXIT: 'Saída',
  ADJUSTMENT_IN: 'Ajuste de entrada',
  ADJUSTMENT_OUT: 'Ajuste de saída',
  TRANSFER: 'Transferência',
};
export function InventoryMovementsPage() {
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [type, setType] = useState<'all' | MovementType>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params = useMemo<MovementParams>(
    () => ({
      page,
      limit: 20,
      sortOrder: 'desc',
      ...(productId !== 'all' ? { productId } : {}),
      ...(locationId !== 'all' ? { locationId } : {}),
      ...(type !== 'all' ? { type } : {}),
      ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
      ...(to ? { to: new Date(`${to}T23:59:59.999`).toISOString() } : {}),
    }),
    [from, locationId, page, productId, to, type],
  );
  const query = useMovements(params);
  const options = useInventoryOptions();
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Estoque"
        title="Movimentações"
        description="Histórico cronológico e imutável de entradas, saídas, ajustes e transferências."
        action={
          <Button asChild variant="outline">
            <Link href="/inventory">
              <ArrowLeft className="size-4" />
              Voltar aos saldos
            </Link>
          </Button>
        }
      />
      <section
        aria-label="Filtros de movimentações"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5"
      >
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
            {Object.entries(labels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          aria-label="Data inicial"
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />
        <Input
          aria-label="Data final"
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {query.isLoading ? (
          <div className="space-y-3 p-5" data-testid="movements-loading">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Não foi possível carregar as movimentações.')}
            onRetry={() => void query.refetch()}
          />
        ) : !query.data?.data.length ? (
          <EmptyState
            title="Nenhuma movimentação encontrada"
            description="Revise os filtros ou registre a primeira movimentação."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.data.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Intl.DateTimeFormat('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(movement.createdAt))}
                      </TableCell>
                      <TableCell>{labels[movement.type]}</TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-950">{movement.product.name}</p>
                        <p className="text-xs text-slate-500">{movement.product.sku}</p>
                      </TableCell>
                      <TableCell>
                        {movement.sourceLocation
                          ? `${movement.sourceLocation.warehouse.code} · ${movement.sourceLocation.code}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {movement.destinationLocation
                          ? `${movement.destinationLocation.warehouse.code} · ${movement.destinationLocation.code}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {movement.quantity} {movement.product.unit.symbol}
                      </TableCell>
                      <TableCell>{movement.performedBy.name}</TableCell>
                      <TableCell>{movement.reason ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              itemLabel="movimentações"
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
