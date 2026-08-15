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
import { useUpdateProductStatus } from '../hooks/use-products';
import type { Product } from '../types/product.types';

export function ProductStatusDialog({ product }: Readonly<{ product: Product }>) {
  const mutation = useUpdateProductStatus();
  const action = product.isActive ? 'Inativar' : 'Ativar';

  const confirm = async () => {
    try {
      await mutation.mutateAsync({ id: product.id, isActive: !product.isActive });
      toast.success(`Produto ${product.isActive ? 'inativado' : 'ativado'} com sucesso.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o status do produto.'));
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Power className="size-4" /> {action}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action} {product.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {product.isActive
              ? 'O produto não poderá ser selecionado em novos processos. Seu histórico será preservado.'
              : 'O produto voltará a ficar disponível para novos processos.'}
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
