'use client';
import { ArrowLeft, Check, Pencil, Send, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
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
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  usePurchaseOrder,
  useSubmitPurchaseOrder,
} from '../hooks/use-purchase-orders';
import { PurchaseOrderStatus } from './purchase-order-status';

export function PurchaseOrderDetailPage({ orderId }: { orderId: string }) {
  const query = usePurchaseOrder(orderId);
  const { user } = useAuth();
  const submit = useSubmitPurchaseOrder();
  const approve = useApprovePurchaseOrder();
  const cancel = useCancelPurchaseOrder();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  if (query.isLoading) return <Skeleton className="h-[600px]" />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        message="Não foi possível carregar o pedido."
        onRetry={() => void query.refetch()}
      />
    );
  const order = query.data;
  const can = (permission: string) => user?.permissions.includes(permission) ?? false;
  const run = async (kind: 'submit' | 'approve') => {
    if (
      !window.confirm(
        kind === 'submit'
          ? `Enviar ${order.number} para aprovação?`
          : `Aprovar ${order.number} no total de ${formatCurrency(order.totalAmount)}?`,
      )
    )
      return;
    try {
      if (kind === 'submit') await submit.mutateAsync(order.id);
      else await approve.mutateAsync(order.id);
      toast.success(
        kind === 'submit'
          ? 'Pedido enviado para aprovação.'
          : 'Pedido aprovado sem alterar o estoque.',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível concluir a ação.'));
    }
  };
  const confirmCancel = async () => {
    try {
      await cancel.mutateAsync({ id: order.id, reason });
      toast.success('Pedido cancelado.');
      setCancelOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível cancelar.'));
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compras"
        title={order.number}
        description="Pedido de compra — aprovação não gera entrada de estoque."
        action={
          <div className="flex flex-wrap gap-2">
            <Link className={cn(buttonVariants({ variant: 'outline' }))} href="/purchases/orders">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
            {order.status === 'DRAFT' && can(PERMISSIONS.PURCHASE_ORDERS_UPDATE) ? (
              <Button asChild variant="outline">
                <Link href={`/purchases/orders/${order.id}/edit`}>
                  <Pencil className="size-4" /> Editar
                </Link>
              </Button>
            ) : null}
            {order.status === 'DRAFT' && can(PERMISSIONS.PURCHASE_ORDERS_SUBMIT) ? (
              <Button onClick={() => void run('submit')}>
                <Send className="size-4" /> Enviar
              </Button>
            ) : null}
            {order.status === 'PENDING_APPROVAL' && can(PERMISSIONS.PURCHASE_ORDERS_APPROVE) ? (
              <Button onClick={() => void run('approve')}>
                <Check className="size-4" /> Aprovar
              </Button>
            ) : null}
            {['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(order.status) &&
            can(PERMISSIONS.PURCHASE_ORDERS_CANCEL) ? (
              <Button onClick={() => setCancelOpen(true)} variant="destructive">
                <XCircle className="size-4" /> Cancelar
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card label="Status">
          <PurchaseOrderStatus status={order.status} />
        </Card>
        <Card label="Fornecedor" value={order.supplier.name} detail={order.supplier.document} />
        <Card label="Depósito" value={order.warehouse.name} detail={order.warehouse.code} />
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
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.productName}</TableCell>
                <TableCell className="font-mono">{item.productSku}</TableCell>
                <TableCell>{item.unitSymbol}</TableCell>
                <TableCell>{formatDecimalPtBr(item.quantity, 4)}</TableCell>
                <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                <TableCell>{formatCurrency(item.subtotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2">
        <div>
          <h2 className="font-semibold">Observações</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
            {order.notes || 'Nenhuma observação.'}
          </p>
          <p className="mt-4 text-sm">
            Criado por {order.createdBy.name} em {new Date(order.createdAt).toLocaleString('pt-BR')}
            .
          </p>
          {order.approvedBy ? (
            <p className="text-sm">
              Aprovado por {order.approvedBy.name} em{' '}
              {new Date(order.approvedAt!).toLocaleString('pt-BR')}.
            </p>
          ) : null}
          {order.cancellationReason ? (
            <p className="mt-2 text-sm text-red-700">Cancelado: {order.cancellationReason}</p>
          ) : null}
        </div>
        <div className="space-y-2 md:justify-self-end md:min-w-72">
          <Total label="Subtotal" value={order.subtotal} />
          <Total label="Desconto" value={order.discountAmount} />
          <Total label="Frete" value={order.freightAmount} />
          <Total label="Outros" value={order.otherAmount} />
          <Total label="Total" value={order.totalAmount} strong />
        </div>
      </div>
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar {order.number}</DialogTitle>
            <DialogDescription>
              O pedido permanecerá no histórico e não poderá ser recebido posteriormente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo</Label>
            <Textarea
              id="cancel-reason"
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
              onClick={() => void confirmCancel()}
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
    <p className={cn('flex justify-between', strong && 'border-t pt-2 text-lg font-bold')}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </p>
  );
}
