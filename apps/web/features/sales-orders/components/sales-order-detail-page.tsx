'use client';

import { ArrowLeft, Check, Pencil, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Button, buttonVariants } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Textarea } from '../../../components/ui/textarea';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { formatCurrency, formatDecimalPtBr } from '../../../lib/decimal';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../auth/hooks/use-auth';
import {
  useCancelSalesOrder,
  useConfirmSalesOrder,
  useSalesOrder,
} from '../hooks/use-sales-orders';
import { SalesOrderStatus } from './sales-order-status';

export function SalesOrderDetailPage({ orderId }: { orderId: string }) {
  const query = useSalesOrder(orderId);
  const { user } = useAuth();
  const confirm = useConfirmSalesOrder();
  const cancel = useCancelSalesOrder();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (query.isLoading) return <Skeleton className="h-[600px]" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        message="Não foi possível carregar o pedido."
        onRetry={() => void query.refetch()}
      />
    );
  }
  const order = query.data;
  const can = (permission: string) => user?.permissions.includes(permission) ?? false;

  const confirmOrder = async () => {
    try {
      await confirm.mutateAsync(order.id);
      toast.success('Pedido confirmado sem reservar ou baixar estoque.');
      setConfirmOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível confirmar o pedido.'));
    }
  };

  const cancelOrder = async () => {
    try {
      await cancel.mutateAsync({ id: order.id, reason });
      toast.success('Pedido cancelado e preservado no histórico.');
      setCancelOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível cancelar o pedido.'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendas"
        title={order.number}
        description="Compromisso comercial sem reserva ou baixa de estoque nesta etapa."
        action={
          <div className="flex flex-wrap gap-2">
            <Link className={cn(buttonVariants({ variant: 'outline' }))} href="/sales/orders">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
            {order.status === 'DRAFT' && can(PERMISSIONS.SALES_ORDERS_UPDATE) ? (
              <Button asChild variant="outline">
                <Link href={`/sales/orders/${order.id}/edit`}>
                  <Pencil className="size-4" /> Editar
                </Link>
              </Button>
            ) : null}
            {order.status === 'DRAFT' && can(PERMISSIONS.SALES_ORDERS_CONFIRM) ? (
              <Button onClick={() => setConfirmOpen(true)}>
                <Check className="size-4" /> Confirmar pedido
              </Button>
            ) : null}
            {order.status !== 'CANCELLED' && can(PERMISSIONS.SALES_ORDERS_CANCEL) ? (
              <Button onClick={() => setCancelOpen(true)} variant="destructive">
                <XCircle className="size-4" /> Cancelar
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card label="Status">
          <SalesOrderStatus status={order.status} />
        </Card>
        <Card label="Cliente" value={order.customer.name} detail={order.customer.document} />
        <Card
          label="Depósito de origem"
          value={order.warehouse.name}
          detail={order.warehouse.code}
        />
        <Card
          label="Previsão"
          value={
            order.expectedDeliveryDate
              ? new Date(`${order.expectedDeliveryDate}T00:00:00`).toLocaleDateString('pt-BR')
              : 'Não informada'
          }
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table className="min-w-[940px]">
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Bruto</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>Reservado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.productName}</TableCell>
                <TableCell className="font-mono">{item.productSku}</TableCell>
                <TableCell>{item.unitSymbol}</TableCell>
                <TableCell>{formatDecimalPtBr(item.quantity, 4)}</TableCell>
                <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell>{formatCurrency(item.grossAmount)}</TableCell>
                <TableCell>{formatCurrency(item.discountAmount)}</TableCell>
                <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                <TableCell>
                  {formatDecimalPtBr(item.reservedQuantity, 4)}
                  <span className="block text-xs text-slate-500">Etapa 16</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">Histórico e observações</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
            {order.notes || 'Nenhuma observação.'}
          </p>
          <p className="mt-4 text-sm">
            Criado por {order.createdBy.name} em {new Date(order.createdAt).toLocaleString('pt-BR')}
            .
          </p>
          {order.confirmedBy ? (
            <p className="text-sm">
              Confirmado por {order.confirmedBy.name} em{' '}
              {new Date(order.confirmedAt!).toLocaleString('pt-BR')}.
            </p>
          ) : null}
          {order.cancelledBy ? (
            <p className="text-sm text-red-700">
              Cancelado por {order.cancelledBy.name}: {order.cancellationReason}
            </p>
          ) : null}
          <p className="mt-3 text-sm">
            Limite cadastrado do cliente:{' '}
            <strong>{formatCurrency(order.customer.creditLimit)}</strong>. Informação sem cálculo de
            crédito disponível.
          </p>
        </div>
        <div className="space-y-2 md:justify-self-end md:min-w-72">
          <Total label="Subtotal dos itens" value={order.subtotal} />
          <Total label="Desconto geral" value={order.discountAmount} />
          <Total label="Frete" value={order.freightAmount} />
          <Total label="Outros" value={order.otherAmount} />
          <Total label="Total" value={order.totalAmount} strong />
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar {order.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Cliente: {order.customer.name}. {order.items.length} item(ns), total{' '}
              {formatCurrency(order.totalAmount)}. A confirmação ainda não baixa nem reserva o
              estoque; isso ocorrerá em fluxo posterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction disabled={confirm.isPending} onClick={() => void confirmOrder()}>
              Confirmar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar {order.number}</DialogTitle>
            <DialogDescription>
              O pedido será cancelado e permanecerá disponível apenas para consulta. Nenhum saldo
              será alterado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sales-cancel-reason">Motivo</Label>
            <Textarea
              id="sales-cancel-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setCancelOpen(false)} variant="outline">
              Voltar
            </Button>
            <Button
              disabled={reason.trim().length < 3 || cancel.isPending}
              onClick={() => void cancelOrder()}
              variant="destructive"
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({
  label,
  value,
  detail,
  children,
}: {
  label: string;
  value?: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <div className="mt-2 font-medium">{children ?? value}</div>
      {detail ? <p className="text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <p className={cn('flex justify-between gap-8', strong && 'border-t pt-2 text-lg font-bold')}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </p>
  );
}
