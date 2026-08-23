'use client';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { buttonVariants } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatCurrency, formatDecimalPtBr } from '../../../lib/decimal';
import { cn } from '../../../lib/utils';
import { usePurchaseReceipt } from '../hooks/use-purchase-receipts';

export function PurchaseReceiptDetailPage({ receiptId }: { receiptId: string }) {
  const query = usePurchaseReceipt(receiptId);
  if (query.isLoading) return <Skeleton className="h-[600px]" />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        message="Não foi possível carregar o recebimento."
        onRetry={() => void query.refetch()}
      />
    );
  const receipt = query.data;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recebimento de compra"
        title={receipt.number}
        description="Histórico imutável de uma entrada confirmada no estoque."
        action={
          <div className="flex flex-wrap gap-2">
            <Link className={cn(buttonVariants({ variant: 'outline' }))} href="/purchases/receipts">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
            <Link
              className={cn(buttonVariants({ variant: 'outline' }))}
              href={`/purchases/orders/${receipt.purchaseOrder.id}`}
            >
              <ExternalLink className="size-4" /> Ver pedido
            </Link>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card label="Pedido" value={receipt.purchaseOrder.number} />
        <Card label="Fornecedor" value={receipt.supplier.name} />
        <Card label="Depósito" value={receipt.warehouse.name} detail={receipt.warehouse.code} />
        <Card label="Recebido em" value={new Date(receipt.receivedAt).toLocaleString('pt-BR')} />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Antes</TableHead>
              <TableHead>Recebido</TableHead>
              <TableHead>Restante</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Divergência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipt.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.product.name}</TableCell>
                <TableCell className="font-mono">{item.product.sku}</TableCell>
                <TableCell className="font-mono">{item.location.code}</TableCell>
                <TableCell>{formatDecimalPtBr(item.orderedQuantity, 4)}</TableCell>
                <TableCell>{formatDecimalPtBr(item.previouslyReceivedQuantity, 4)}</TableCell>
                <TableCell>{formatDecimalPtBr(item.receivedQuantity, 4)}</TableCell>
                <TableCell>{formatDecimalPtBr(item.remainingQuantity, 4)}</TableCell>
                <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                <TableCell>{item.discrepancyReason || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">Observações</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
            {receipt.notes || 'Nenhuma observação.'}
          </p>
        </div>
        <div className="md:text-right">
          <p className="text-sm text-slate-500">Responsável</p>
          <p className="font-medium">{receipt.receivedBy.name}</p>
          <p className="mt-3 text-sm text-slate-500">Quantidade total</p>
          <p className="text-lg font-bold">{formatDecimalPtBr(receipt.totalQuantity, 4)}</p>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
      {detail ? <p className="text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}
