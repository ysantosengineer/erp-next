'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { useWarehouses } from '../../warehouses/hooks/use-warehouses';
import { useCreateInventoryCount } from '../hooks/use-inventory-counts';
import {
  createInventoryCountSchema,
  type CreateInventoryCountFormValues,
} from '../schemas/inventory-count.schema';

export function CreateInventoryCountDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const create = useCreateInventoryCount();
  const warehouses = useWarehouses({
    page: 1,
    limit: 100,
    status: 'active',
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateInventoryCountFormValues>({
    resolver: zodResolver(createInventoryCountSchema),
    defaultValues: { warehouseId: '', description: '' },
  });
  const close = () => {
    reset();
    setOpen(false);
  };
  const submit = async (values: CreateInventoryCountFormValues) => {
    try {
      const created = await create.mutateAsync({
        warehouseId: values.warehouseId,
        ...(values.description ? { description: values.description } : {}),
      });
      toast.success('Inventário criado. Inicie-o para capturar o saldo atual.');
      close();
      router.push(`/inventory/counts/${created.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível criar o inventário.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Novo inventário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo inventário físico</DialogTitle>
          <DialogDescription>
            Escolha o depósito. O saldo será fotografado somente quando o inventário for iniciado.
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-5 space-y-4"
          id="create-inventory-count"
          onSubmit={handleSubmit(submit)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="inventory-warehouse">Depósito</Label>
            <Controller
              control={control}
              name="warehouseId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="inventory-warehouse">
                    <SelectValue placeholder="Selecione um depósito" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.data?.data.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} · {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.warehouseId ? (
              <p className="text-sm text-red-700">{errors.warehouseId.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inventory-description">Descrição opcional</Label>
            <Textarea id="inventory-description" {...register('description')} />
            {errors.description ? (
              <p className="text-sm text-red-700">{errors.description.message}</p>
            ) : null}
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button form="create-inventory-count" type="submit" disabled={create.isPending}>
            {create.isPending ? 'Criando…' : 'Criar inventário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
