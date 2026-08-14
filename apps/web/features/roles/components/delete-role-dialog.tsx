'use client';

import { Trash2 } from 'lucide-react';
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
import { useDeleteRole } from '../hooks/use-roles';
import type { Role } from '../types/role.types';

export function DeleteRoleDialog({ role }: Readonly<{ role: Role }>) {
  const deleteRole = useDeleteRole();
  if (role.isSystem) return null;

  const confirm = async () => {
    try {
      await deleteRole.mutateAsync(role.id);
      toast.success('Papel excluído com sucesso.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível excluir o papel.'));
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button aria-label={`Excluir ${role.name}`} size="sm" type="button" variant="ghost">
          <Trash2 aria-hidden="true" className="size-4" />
          Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir papel “{role.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não poderá ser desfeita. Papéis atribuídos a usuários não podem ser excluídos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={deleteRole.isPending} onClick={() => void confirm()}>
            {deleteRole.isPending ? 'Excluindo…' : 'Excluir papel'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
