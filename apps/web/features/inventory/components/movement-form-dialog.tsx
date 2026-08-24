'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import {
  useCreateAdjustment,
  useCreateEntry,
  useCreateExit,
  useCreateTransfer,
  useInventoryOptions,
  useProductBalance,
} from '../hooks/use-inventory';
import { movementFormSchema, type MovementFormValues } from '../schemas/inventory.schema';

export type MovementAction = 'entry' | 'exit' | 'adjustment' | 'transfer';
const definitions = {
  entry: {
    title: 'Nova entrada',
    description: 'Adicione mercadorias a um endereço.',
    icon: ArrowDownToLine,
  },
  exit: {
    title: 'Nova saída',
    description: 'Retire mercadorias de um endereço com saldo.',
    icon: ArrowUpFromLine,
  },
  adjustment: {
    title: 'Ajustar saldo',
    description: 'Corrija o saldo com um motivo obrigatório.',
    icon: SlidersHorizontal,
  },
  transfer: {
    title: 'Transferir estoque',
    description: 'Mova mercadorias entre endereços.',
    icon: ArrowLeftRight,
  },
} as const;

export function MovementFormDialog({ action }: Readonly<{ action: MovementAction }>) {
  const [open, setOpen] = useState(false);
  const options = useInventoryOptions();
  const entry = useCreateEntry();
  const exit = useCreateExit();
  const adjustment = useCreateAdjustment();
  const transfer = useCreateTransfer();
  const definition = definitions[action];
  const Icon = definition.icon;
  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      productId: '',
      quantity: '',
      sourceLocationId: '',
      destinationLocationId: '',
      direction: 'IN',
      reason: '',
      idempotencyKey: '',
    },
  });
  const productId = useWatch({ control: form.control, name: 'productId' });
  const sourceLocationId = useWatch({ control: form.control, name: 'sourceLocationId' });
  const destinationLocationId = useWatch({
    control: form.control,
    name: 'destinationLocationId',
  });
  const direction = useWatch({ control: form.control, name: 'direction' });
  const productBalance = useProductBalance(productId);
  const availableBalance = productBalance.data?.locations.find(
    (location) => location.id === sourceLocationId,
  )?.quantity;
  const pending = entry.isPending || exit.isPending || adjustment.isPending || transfer.isPending;
  const close = () => {
    form.reset();
    setOpen(false);
  };
  const locationSelect = (field: 'sourceLocationId' | 'destinationLocationId', label: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={field === 'sourceLocationId' ? sourceLocationId : destinationLocationId}
        onValueChange={(value) => form.setValue(field, value, { shouldValidate: true })}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {options.data?.locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.warehouse.code} · {location.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  const submit = async (values: MovementFormValues) => {
    const idempotencyKey = values.idempotencyKey || crypto.randomUUID();
    try {
      if (action === 'entry') {
        if (!values.destinationLocationId)
          return form.setError('destinationLocationId', { message: 'Selecione o destino.' });
        await entry.mutateAsync({
          productId: values.productId,
          quantity: values.quantity,
          destinationLocationId: values.destinationLocationId,
          reason: values.reason || undefined,
          idempotencyKey,
        });
      } else if (action === 'exit') {
        if (!values.sourceLocationId)
          return form.setError('sourceLocationId', { message: 'Selecione a origem.' });
        await exit.mutateAsync({
          productId: values.productId,
          quantity: values.quantity,
          sourceLocationId: values.sourceLocationId,
          reason: values.reason || undefined,
          idempotencyKey,
        });
      } else if (action === 'adjustment') {
        if (!values.destinationLocationId)
          return form.setError('destinationLocationId', { message: 'Selecione o endereço.' });
        if (!values.reason?.trim())
          return form.setError('reason', { message: 'Informe o motivo do ajuste.' });
        await adjustment.mutateAsync({
          productId: values.productId,
          quantity: values.quantity,
          locationId: values.destinationLocationId,
          direction: values.direction ?? 'IN',
          reason: values.reason,
          idempotencyKey,
        });
      } else {
        if (!values.sourceLocationId || !values.destinationLocationId)
          return form.setError('destinationLocationId', { message: 'Selecione origem e destino.' });
        if (values.sourceLocationId === values.destinationLocationId)
          return form.setError('destinationLocationId', {
            message: 'O destino deve ser diferente da origem.',
          });
        await transfer.mutateAsync({
          productId: values.productId,
          quantity: values.quantity,
          sourceLocationId: values.sourceLocationId,
          destinationLocationId: values.destinationLocationId,
          reason: values.reason || undefined,
          idempotencyKey,
        });
      }
      toast.success('Movimentação registrada com sucesso.');
      close();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível registrar a movimentação.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button variant={action === 'entry' ? 'default' : 'outline'}>
          <Icon className="size-4" />
          {definition.title}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{definition.title}</DialogTitle>
          <DialogDescription>{definition.description}</DialogDescription>
        </DialogHeader>
        <form
          className="mt-4 space-y-4"
          id={`movement-${action}`}
          onSubmit={form.handleSubmit(submit)}
        >
          <div className="space-y-1.5">
            <Label>Produto</Label>
            <Select
              value={productId}
              onValueChange={(value) => form.setValue('productId', value, { shouldValidate: true })}
            >
              <SelectTrigger aria-label="Produto">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {options.data?.products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} · {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.productId ? (
              <p className="text-sm text-red-700">{form.formState.errors.productId.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`quantity-${action}`}>Quantidade</Label>
            <Input
              id={`quantity-${action}`}
              inputMode="decimal"
              placeholder="0.0000"
              {...form.register('quantity')}
            />
            {form.formState.errors.quantity ? (
              <p className="text-sm text-red-700">{form.formState.errors.quantity.message}</p>
            ) : null}
          </div>
          {action === 'exit' || action === 'transfer'
            ? locationSelect('sourceLocationId', 'Endereço de origem')
            : null}
          {action === 'exit' || action === 'transfer' ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Saldo disponível:{' '}
              <strong className="text-slate-950">
                {availableBalance ?? '—'} {productBalance.data?.product.unit.symbol ?? ''}
              </strong>
            </p>
          ) : null}
          {action === 'entry' || action === 'transfer' || action === 'adjustment'
            ? locationSelect(
                'destinationLocationId',
                action === 'adjustment' ? 'Endereço' : 'Endereço de destino',
              )
            : null}
          {action === 'adjustment' ? (
            <div className="space-y-1.5">
              <Label>Direção</Label>
              <Select
                value={direction}
                onValueChange={(value) => form.setValue('direction', value as 'IN' | 'OUT')}
              >
                <SelectTrigger aria-label="Direção">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Entrada (somar)</SelectItem>
                  <SelectItem value="OUT">Saída (subtrair)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${action}`}>
              Motivo {action === 'adjustment' ? '(obrigatório)' : '(opcional)'}
            </Label>
            <Textarea id={`reason-${action}`} {...form.register('reason')} />
            {form.formState.errors.reason ? (
              <p className="text-sm text-red-700">{form.formState.errors.reason.message}</p>
            ) : null}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button form={`movement-${action}`} type="submit" disabled={pending || options.isLoading}>
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
