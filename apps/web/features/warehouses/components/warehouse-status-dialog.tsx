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
import { useUpdateWarehouseStatus } from '../hooks/use-warehouses';
import type { Warehouse } from '../types/warehouse.types';

export function WarehouseStatusDialog({ warehouse }: Readonly<{ warehouse: Warehouse }>) {
  const mutation = useUpdateWarehouseStatus();
  const action = warehouse.isActive ? 'Inativar' : 'Ativar';
  const confirm = async () => {
    try {
      await mutation.mutateAsync({ id: warehouse.id, isActive: !warehouse.isActive });
      toast.success(`Depósito ${warehouse.isActive ? 'inativado' : 'ativado'} com sucesso.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o depósito.'));
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
            {action} {warehouse.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {warehouse.isActive
              ? 'O depósito não será excluído e ficará indisponível para novas operações futuras. Endereços ativos precisam ser inativados antes.'
              : 'O depósito voltará a ficar disponível para operações futuras.'}
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
