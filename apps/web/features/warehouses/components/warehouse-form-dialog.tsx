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
import { useCreateWarehouse, useUpdateWarehouse } from '../hooks/use-warehouses';
import {
  toWarehouseInput,
  warehouseSchema,
  warehouseToForm,
  type WarehouseFormValues,
} from '../schemas/warehouse.schema';
import type { Warehouse } from '../types/warehouse.types';

export function WarehouseFormDialog({ warehouse }: Readonly<{ warehouse?: Warehouse }>) {
  const [open, setOpen] = useState(false);
  const create = useCreateWarehouse();
  const update = useUpdateWarehouse();
  const editing = Boolean(warehouse);
  const prefix = warehouse ? `edit-warehouse-${warehouse.id}` : 'create-warehouse';
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: warehouseToForm(warehouse),
  });

  useEffect(() => reset(warehouseToForm(warehouse)), [reset, warehouse]);
  const close = () => {
    reset(warehouseToForm(warehouse));
    setOpen(false);
  };
  const submit = async (values: WarehouseFormValues) => {
    try {
      const input = toWarehouseInput(values, editing);
      if (warehouse) await update.mutateAsync({ id: warehouse.id, input });
      else await create.mutateAsync(input);
      toast.success(editing ? 'Depósito atualizado com sucesso.' : 'Depósito criado com sucesso.');
      close();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'WAREHOUSE_CODE_EXISTS') {
        setError('code', { message: 'Este código já está em uso na empresa.' });
        return;
      }
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o depósito.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button size={warehouse ? 'sm' : 'default'} variant={warehouse ? 'ghost' : 'default'}>
          {warehouse ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {warehouse ? 'Editar' : 'Novo depósito'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{warehouse ? 'Editar depósito' : 'Novo depósito'}</DialogTitle>
          <DialogDescription>
            Identifique o espaço físico que armazenará mercadorias.
          </DialogDescription>
        </DialogHeader>
        <form className="mt-5 space-y-4" id={prefix} noValidate onSubmit={handleSubmit(submit)}>
          <div className="space-y-1.5">
            <Label htmlFor={`${prefix}-name`}>Nome</Label>
            <Input id={`${prefix}-name`} {...register('name')} />
            {errors.name ? <p className="text-sm text-red-700">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${prefix}-code`}>Código</Label>
            <Input id={`${prefix}-code`} autoCapitalize="characters" {...register('code')} />
            {errors.code ? <p className="text-sm text-red-700">{errors.code.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${prefix}-description`}>Descrição</Label>
            <Textarea id={`${prefix}-description`} {...register('description')} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button form={prefix} type="submit" disabled={create.isPending || update.isPending}>
            Salvar depósito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
