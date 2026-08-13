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
import { useUpdateSupplierStatus } from '../hooks/use-suppliers';
import type { Supplier } from '../types/supplier.types';
export function SupplierStatusDialog({ supplier }: Readonly<{ supplier: Supplier }>) {
  const mutation = useUpdateSupplierStatus(),
    action = supplier.isActive ? 'Inativar' : 'Ativar';
  const confirm = async () => {
    try {
      await mutation.mutateAsync({ id: supplier.id, isActive: !supplier.isActive });
      toast.success(
        supplier.isActive ? 'Fornecedor inativado com sucesso.' : 'Fornecedor ativado com sucesso.',
      );
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível atualizar o status.'));
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
            {action} {supplier.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {supplier.isActive
              ? 'O fornecedor deixará de estar disponível para novos processos futuros. Os dados históricos serão preservados.'
              : 'O fornecedor voltará a estar disponível.'}
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
