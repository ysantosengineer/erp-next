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
import { useUpdateCustomerStatus } from '../hooks/use-customers';
import type { Customer } from '../types/customer.types';

export function CustomerStatusDialog({ customer }: Readonly<{ customer: Customer }>) {
  const mutation = useUpdateCustomerStatus();
  const action = customer.isActive ? 'Inativar' : 'Ativar';

  const confirm = async () => {
    try {
      await mutation.mutateAsync({ id: customer.id, isActive: !customer.isActive });
      toast.success(
        customer.isActive ? 'Cliente inativado com sucesso.' : 'Cliente ativado com sucesso.',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o status.'));
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
            {action} {customer.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {customer.isActive
              ? 'O cliente deixará de estar disponível para novos processos. O histórico será preservado.'
              : 'O cliente voltará a estar disponível para novos processos.'}
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
