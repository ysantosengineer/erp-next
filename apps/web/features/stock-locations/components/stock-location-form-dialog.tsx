'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '../../../components/ui/textarea';
import { ApiError } from '../../../lib/api/api-error';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { useCreateStockLocation, useUpdateStockLocation } from '../hooks/use-stock-locations';
import {
  stockLocationSchema,
  stockLocationToForm,
  toStockLocationInput,
  type StockLocationFormValues,
} from '../schemas/stock-location.schema';
import type { StockLocation } from '../types/stock-location.types';

export function StockLocationFormDialog({
  warehouseId,
  location,
  disabled = false,
}: Readonly<{ warehouseId: string; location?: StockLocation; disabled?: boolean }>) {
  const [open, setOpen] = useState(false);
  const create = useCreateStockLocation(warehouseId);
  const update = useUpdateStockLocation(warehouseId);
  const editing = Boolean(location);
  const prefix = location ? `edit-location-${location.id}` : 'create-location';
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<StockLocationFormValues>({
    resolver: zodResolver(stockLocationSchema),
    defaultValues: stockLocationToForm(location),
  });
  useEffect(() => reset(stockLocationToForm(location)), [location, reset]);
  const close = () => {
    reset(stockLocationToForm(location));
    setOpen(false);
  };
  const submit = async (values: StockLocationFormValues) => {
    try {
      const input = toStockLocationInput(values, editing);
      if (location) await update.mutateAsync({ id: location.id, input });
      else await create.mutateAsync(input);
      toast.success(editing ? 'Endereço atualizado com sucesso.' : 'Endereço criado com sucesso.');
      close();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'STOCK_LOCATION_CODE_EXISTS') {
        setError('code', { message: 'Este código já está em uso no depósito.' });
        return;
      }
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o endereço.'));
    }
  };
  const field = (name: keyof StockLocationFormValues, label: string, className?: string) => (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={`${prefix}-${name}`}>{label}</Label>
      <Input
        id={`${prefix}-${name}`}
        inputMode={name === 'capacity' ? 'decimal' : undefined}
        {...register(name)}
      />
      {errors[name] ? <p className="text-sm text-red-700">{errors[name]?.message}</p> : null}
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button
          disabled={disabled}
          size={location ? 'sm' : 'default'}
          variant={location ? 'ghost' : 'default'}
        >
          {location ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {location ? 'Editar' : 'Novo endereço'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{location ? 'Editar endereço' : 'Novo endereço'}</DialogTitle>
          <DialogDescription>
            O código é obrigatório; os campos físicos e a capacidade são opcionais.
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          id={prefix}
          noValidate
          onSubmit={handleSubmit(submit)}
        >
          {field('code', 'Código')} {field('capacity', 'Capacidade')}
          {field('zone', 'Zona')} {field('aisle', 'Corredor')} {field('rack', 'Prateleira')}{' '}
          {field('level', 'Nível')} {field('position', 'Posição')}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${prefix}-description`}>Descrição</Label>
            <Textarea id={`${prefix}-description`} {...register('description')} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button form={prefix} type="submit" disabled={create.isPending || update.isPending}>
            Salvar endereço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
