'use client';

import { Power } from 'lucide-react';
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
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog';
import { Button } from '../../../components/ui/button';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { useUpdateStockLocationStatus } from '../hooks/use-stock-locations';
import type { StockLocation } from '../types/stock-location.types';

export function StockLocationStatusDialog({
  warehouseId,
  location,
}: Readonly<{ warehouseId: string; location: StockLocation }>) {
  const mutation = useUpdateStockLocationStatus(warehouseId);
  const action = location.isActive ? 'Inativar' : 'Ativar';
  const confirm = async () => {
    try {
      await mutation.mutateAsync({ id: location.id, isActive: !location.isActive });
      toast.success(`Endereço ${location.isActive ? 'inativado' : 'ativado'} com sucesso.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o endereço.'));
    }
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Power className="size-4" />
          {action}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action} {location.code}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {location.isActive
              ? 'O endereço não será excluído e ficará indisponível para novas operações futuras.'
              : 'O endereço voltará a ficar disponível para operações futuras.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={mutation.isPending} onClick={() => void confirm()}>
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
