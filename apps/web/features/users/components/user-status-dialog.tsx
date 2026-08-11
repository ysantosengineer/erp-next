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
import { useUpdateUserStatus } from '../hooks/use-users';
import type { User } from '../types/user.types';

export function UserStatusDialog({
  user,
  isCurrentUser,
}: Readonly<{ user: User; isCurrentUser: boolean }>) {
  const updateStatus = useUpdateUserStatus();
  const action = user.isActive ? 'Inativar' : 'Ativar';

  const confirm = async () => {
    try {
      await updateStatus.mutateAsync({ id: user.id, isActive: !user.isActive });
      toast.success(
        user.isActive ? 'Usuário inativado com sucesso.' : 'Usuário ativado com sucesso.',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Não foi possível ${action.toLowerCase()} o usuário.`));
    }
  };

  if (isCurrentUser && user.isActive) {
    return (
      <Button
        disabled
        size="sm"
        title="Você não pode inativar a própria conta."
        type="button"
        variant="ghost"
      >
        <Power aria-hidden="true" className="size-4" />
        Inativar
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" type="button" variant="ghost">
          <Power aria-hidden="true" className="size-4" />
          {action}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action} {user.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user.isActive
              ? 'Este usuário perderá o acesso ao ERP e suas sessões serão encerradas.'
              : 'Este usuário poderá voltar a autenticar-se no ERP.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={updateStatus.isPending} onClick={() => void confirm()}>
            {updateStatus.isPending ? 'Processando…' : action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
