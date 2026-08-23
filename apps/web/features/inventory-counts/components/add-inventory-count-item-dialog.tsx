'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
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
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { useAddInventoryCountItem, useInventoryCountOptions } from '../hooks/use-inventory-counts';

export function AddInventoryCountItemDialog({
  inventoryCountId,
  warehouseId,
}: Readonly<{ inventoryCountId: string; warehouseId: string }>) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const options = useInventoryCountOptions(warehouseId);
  const add = useAddInventoryCountItem();
  const close = () => {
    setProductId('');
    setLocationId('');
    setOpen(false);
  };
  const submit = async () => {
    if (!productId || !locationId) {
      toast.error('Selecione o produto e o endereço.');
      return;
    }
    try {
      await add.mutateAsync({ id: inventoryCountId, input: { productId, locationId } });
      toast.success('Item incluído com saldo teórico zero.');
      close();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível incluir o item.'));
    }
  };
  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Mercadoria encontrada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar item sem saldo</DialogTitle>
          <DialogDescription>
            Use apenas para mercadoria encontrada fisicamente que não possuía registro de saldo.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Produto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger aria-label="Produto encontrado">
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
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger aria-label="Endereço encontrado">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {options.data?.locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button disabled={add.isPending} onClick={() => void submit()}>
            {add.isPending ? 'Adicionando…' : 'Adicionar item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
