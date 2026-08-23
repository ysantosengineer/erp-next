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
import { formatDecimalPtBr } from '../../../lib/decimal';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { useAuth } from '../../auth/hooks/use-auth';
import { usePurchaseReceiptOptions, usePurchaseReceipts } from '../hooks/use-purchase-receipts';
import type { PurchaseReceiptFilters } from '../types/purchase-receipt.types';

const initial: PurchaseReceiptFilters = {
  page: 1,
  limit: 20,
  sortBy: 'receivedAt',
  sortOrder: 'desc',
};

export function PurchaseReceiptsPage() {
  const [filters, setFilters] = useState(initial);
  const { user } = useAuth();
  const query = usePurchaseReceipts(filters);
  const options = usePurchaseReceiptOptions();
  const set = (patch: Partial<PurchaseReceiptFilters>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compras"
        title="Recebimentos"
        description="Consulte as entradas confirmadas de mercadorias e sua origem nos pedidos."
        action={
          user?.permissions.includes(PERMISSIONS.PURCHASE_RECEIPTS_CREATE) ? (
            <Button asChild>
              <Link href="/purchases/orders?status=APPROVED">
                <Plus className="size-4" /> Novo recebimento
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3 xl:grid-cols-5">
        <Input
          aria-label="Pesquisar recebimentos"
          placeholder="Recebimento, pedido ou fornecedor"
          value={filters.search ?? ''}
          onChange={(event) => set({ search: event.target.value || undefined })}
        />
        <Select
          value={filters.supplierId ?? 'all'}
          onValueChange={(value) => set({ supplierId: value === 'all' ? undefined : value })}
        >
          <SelectTrigger aria-label="Fornecedor">
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {options.data?.suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
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
          message="Não foi possível carregar os recebimentos."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data?.data.length ? (
        <EmptyState
          title="Nenhum recebimento encontrado"
          description="Receba um pedido aprovado ou ajuste os filtros."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Recebimento</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-mono font-medium">{receipt.number}</TableCell>
                    <TableCell className="font-mono">{receipt.purchaseOrder.number}</TableCell>
                    <TableCell>{receipt.supplier.name}</TableCell>
                    <TableCell>{receipt.warehouse.name}</TableCell>
                    <TableCell>{new Date(receipt.receivedAt).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{receipt.itemCount}</TableCell>
                    <TableCell>{formatDecimalPtBr(receipt.totalQuantity, 4)}</TableCell>
                    <TableCell>{receipt.receivedBy.name}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/purchases/receipts/${receipt.id}`}>Detalhes</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            itemLabel="recebimentos"
            page={query.data.meta.page}
            pageSize={query.data.meta.limit}
            total={query.data.meta.total}
            totalPages={query.data.meta.totalPages}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </div>
      )}
    </div>
  );
}
