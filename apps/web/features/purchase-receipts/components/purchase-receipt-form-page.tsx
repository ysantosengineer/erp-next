'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, PackageCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
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
import { ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { Button, buttonVariants } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
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
import { Textarea } from '../../../components/ui/textarea';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { formatDecimalPtBr, normalizeDecimal } from '../../../lib/decimal';
import { cn } from '../../../lib/utils';
import {
  useCreatePurchaseReceipt,
  useReceivablePurchaseOrder,
} from '../hooks/use-purchase-receipts';
import {
  purchaseReceiptSchema,
  type PurchaseReceiptFormValues,
} from '../schemas/purchase-receipt.schema';

export function PurchaseReceiptFormPage({ orderId }: { orderId: string }) {
  const router = useRouter();
  const query = useReceivablePurchaseOrder(orderId);
  const create = useCreatePurchaseReceipt();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<PurchaseReceiptFormValues | null>(null);
  const form = useForm<PurchaseReceiptFormValues>({
    resolver: zodResolver(purchaseReceiptSchema),
    defaultValues: { notes: '', items: [] },
  });
  const values = useWatch({ control: form.control });

  useEffect(() => {
    if (!query.data) return;
    form.reset({
      notes: '',
      items: query.data.items.map((item) => ({
        purchaseOrderItemId: item.id,
        locationId: '',
        receivedQuantity: '0',
        discrepancyReason: '',
      })),
    });
  }, [form, query.data]);

  const summary = useMemo(() => {
    if (!query.data) return { items: 0, quantity: 0, complete: false };
    let selectedItems = 0;
    let quantity = 0;
    let complete = true;
    query.data.items.forEach((item, index) => {
      const current = Number(normalizeDecimal(values.items?.[index]?.receivedQuantity ?? '0')) || 0;
      if (current > 0) selectedItems += 1;
      quantity += current;
      if (current < Number(item.pendingQuantity)) complete = false;
    });
    return { items: selectedItems, quantity, complete };
  }, [query.data, values.items]);

  if (query.isLoading) return <Skeleton className="h-[700px]" />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        message="O pedido não está disponível para recebimento."
        onRetry={() => void query.refetch()}
      />
    );
  const order = query.data;

  const fillPending = () => {
    order.items.forEach((item, index) => {
      form.setValue(`items.${index}.receivedQuantity`, item.pendingQuantity, {
        shouldValidate: true,
      });
    });
  };

  const prepareConfirmation = (data: PurchaseReceiptFormValues) => {
    let valid = true;
    data.items.forEach((item, index) => {
      const quantity = Number(normalizeDecimal(item.receivedQuantity));
      if (quantity > Number(order.items[index].pendingQuantity)) {
        form.setError(`items.${index}.receivedQuantity`, {
          message: 'A quantidade excede o pendente.',
        });
        valid = false;
      }
    });
    if (!valid) return;
    setPendingValues(data);
    setConfirmationOpen(true);
  };

  const confirm = async () => {
    if (!pendingValues) return;
    try {
      const receipt = await create.mutateAsync({
        purchaseOrderId: order.orderId,
        idempotencyKey: idempotencyKey.current,
        notes: pendingValues.notes.trim() || null,
        items: pendingValues.items
          .filter((item) => Number(normalizeDecimal(item.receivedQuantity)) > 0)
          .map((item) => ({
            purchaseOrderItemId: item.purchaseOrderItemId,
            locationId: item.locationId,
            receivedQuantity: normalizeDecimal(item.receivedQuantity),
            discrepancyReason: item.discrepancyReason.trim() || null,
          })),
      });
      toast.success(`Recebimento ${receipt.number} confirmado e estoque atualizado.`);
      router.push(`/purchases/receipts/${receipt.id}`);
    } catch (error) {
      setConfirmationOpen(false);
      toast.error(getApiErrorMessage(error, 'Não foi possível confirmar o recebimento.'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recebimento de compra"
        title={`Receber ${order.number}`}
        description="Informe somente o que chegou fisicamente e confirme o local de destino."
        action={
          <Link
            className={cn(buttonVariants({ variant: 'outline' }))}
            href={`/purchases/orders/${order.orderId}`}
          >
            <ArrowLeft className="size-4" /> Voltar ao pedido
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card label="Fornecedor" value={order.supplier.name} />
        <Card label="Depósito" value={order.warehouse.name} detail={order.warehouse.code} />
        <Card label="Status" value={order.status === 'APPROVED' ? 'Aprovado' : 'Parcial'} />
        <Card
          label="Previsão"
          value={
            order.expectedDeliveryDate
              ? new Date(`${order.expectedDeliveryDate}T00:00:00`).toLocaleDateString('pt-BR')
              : 'Não informada'
          }
        />
      </div>
      <form className="space-y-6" onSubmit={form.handleSubmit(prepareConfirmation)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Quantidades iniciam em zero para evitar recebimento acidental.
          </p>
          <Button onClick={fillPending} type="button" variant="outline">
            <PackageCheck className="size-4" /> Receber todas as pendências
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <Table className="min-w-[1250px]">
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Recebido</TableHead>
                <TableHead>Pendente</TableHead>
                <TableHead>Receber agora</TableHead>
                <TableHead>Local de destino</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.productName}</span>
                    <span className="ml-2 text-xs text-slate-500">{item.unitSymbol}</span>
                  </TableCell>
                  <TableCell className="font-mono">{item.productSku}</TableCell>
                  <TableCell>{formatDecimalPtBr(item.orderedQuantity, 4)}</TableCell>
                  <TableCell>{formatDecimalPtBr(item.receivedQuantity, 4)}</TableCell>
                  <TableCell>{formatDecimalPtBr(item.pendingQuantity, 4)}</TableCell>
                  <TableCell className="w-44 align-top">
                    <Label className="sr-only" htmlFor={`quantity-${item.id}`}>
                      Receber agora — {item.productName}
                    </Label>
                    <Input
                      id={`quantity-${item.id}`}
                      inputMode="decimal"
                      aria-invalid={Boolean(form.formState.errors.items?.[index]?.receivedQuantity)}
                      {...form.register(`items.${index}.receivedQuantity`)}
                    />
                    {form.formState.errors.items?.[index]?.receivedQuantity ? (
                      <p className="mt-1 text-xs text-red-700">
                        {form.formState.errors.items[index]?.receivedQuantity?.message}
                      </p>
                    ) : null}
                    <input type="hidden" {...form.register(`items.${index}.purchaseOrderItemId`)} />
                  </TableCell>
                  <TableCell className="w-64 align-top">
                    <Label className="sr-only" htmlFor={`location-${item.id}`}>
                      Local de destino — {item.productName}
                    </Label>
                    <Select
                      value={values.items?.[index]?.locationId ?? ''}
                      onValueChange={(value) =>
                        form.setValue(`items.${index}.locationId`, value, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger id={`location-${item.id}`}>
                        <SelectValue placeholder="Selecione o endereço" />
                      </SelectTrigger>
                      <SelectContent>
                        {order.locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {locationLabel(location)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.items?.[index]?.locationId ? (
                      <p className="mt-1 text-xs text-red-700">
                        {form.formState.errors.items[index]?.locationId?.message}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="w-64 align-top">
                    <Label className="sr-only" htmlFor={`reason-${item.id}`}>
                      Observação — {item.productName}
                    </Label>
                    <Input
                      id={`reason-${item.id}`}
                      placeholder="Avaria ou divergência"
                      {...form.register(`items.${index}.discrepancyReason`)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {form.formState.errors.items?.root ? (
          <p className="text-sm text-red-700">{form.formState.errors.items.root.message}</p>
        ) : null}
        <div className="grid gap-5 rounded-xl border bg-white p-5 lg:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="receipt-notes">Observações gerais</Label>
            <Textarea id="receipt-notes" rows={4} {...form.register('notes')} />
          </div>
          <div className="min-w-72 space-y-2 rounded-lg bg-slate-50 p-4">
            <p className="flex justify-between gap-6">
              <span>Itens a receber</span>
              <strong>{summary.items}</strong>
            </p>
            <p className="flex justify-between gap-6">
              <span>Quantidade total</span>
              <strong>
                {summary.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
              </strong>
            </p>
            <p className="flex justify-between gap-6 border-t pt-2">
              <span>Pedido ficará</span>
              <strong>{summary.complete ? 'Recebido' : 'Parcialmente recebido'}</strong>
            </p>
            <Button className="mt-3 w-full" disabled={create.isPending} type="submit">
              <Check className="size-4" /> Revisar e confirmar
            </Button>
          </div>
        </div>
      </form>
      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recebimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta operação gerará entradas reais no estoque e não poderá ser editada ou excluída
              depois. Confira quantidades e locais antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={create.isPending}>Revisar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700"
              disabled={create.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirm();
              }}
            >
              {create.isPending ? 'Confirmando...' : 'Confirmar recebimento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function locationLabel(location: {
  code: string;
  zone: string | null;
  aisle: string | null;
  rack: string | null;
}) {
  return [location.code, location.zone, location.aisle, location.rack].filter(Boolean).join(' · ');
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
