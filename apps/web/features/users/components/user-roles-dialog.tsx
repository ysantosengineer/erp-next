'use client';

import { ShieldCheck } from 'lucide-react';
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
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { useAuth } from '../../auth/hooks/use-auth';
import { useRoles } from '../../roles/hooks/use-roles';
import { useUpdateUserRoles } from '../hooks/use-users';
import type { User } from '../types/user.types';
import { RoleCheckboxList } from './role-checkbox-list';

export function UserRolesDialog({ user }: Readonly<{ user: User }>) {
  const [open, setOpen] = useState(false);
  const [roleIds, setRoleIds] = useState<string[]>(user.roles.map((role) => role.id));
  const roles = useRoles(open);
  const updateRoles = useUpdateUserRoles();
  const auth = useAuth();

  const handleOpenChange = (value: boolean) => {
    if (value) setRoleIds(user.roles.map((role) => role.id));
    setOpen(value);
  };

  const submit = async () => {
    try {
      await updateRoles.mutateAsync({ id: user.id, roleIds });
      toast.success('Papéis atualizados com sucesso.');
      setOpen(false);
      if (user.id === auth.user?.id) await auth.refreshSession();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar os papéis.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          aria-label={`Alterar papéis de ${user.name}`}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          Papéis
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Papéis de {user.name}</DialogTitle>
          <DialogDescription>
            Selecione apenas os papéis necessários. Mudanças de autorização encerram as sessões
            atuais do usuário.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          {roles.isLoading ? (
            <p className="text-sm text-slate-500">Carregando papéis…</p>
          ) : roles.isError ? (
            <p className="text-sm text-red-700">Não foi possível carregar os papéis.</p>
          ) : (
            <RoleCheckboxList
              roles={roles.data ?? []}
              selectedIds={roleIds}
              onChange={setRoleIds}
            />
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} type="button" variant="outline">
            Cancelar
          </Button>
          <Button
            disabled={roles.isLoading || roles.isError || updateRoles.isPending}
            onClick={() => void submit()}
            type="button"
          >
            {updateRoles.isPending ? 'Salvando…' : 'Salvar papéis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
