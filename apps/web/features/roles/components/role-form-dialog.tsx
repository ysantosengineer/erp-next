'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { ApiError } from '../../../lib/api/api-error';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { useCreateRole, useUpdateRole } from '../hooks/use-roles';
import { roleSchema, type RoleFormValues } from '../schemas/role.schema';
import type { Role } from '../types/role.types';

export function RoleFormDialog({ role }: Readonly<{ role?: Role }>) {
  const [open, setOpen] = useState(false);
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const mutationPending = createRole.isPending || updateRole.isPending;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: role?.name ?? '', description: role?.description ?? '' },
  });

  useEffect(
    () => reset({ name: role?.name ?? '', description: role?.description ?? '' }),
    [reset, role],
  );

  const close = () => {
    reset({ name: role?.name ?? '', description: role?.description ?? '' });
    setOpen(false);
  };

  const submit = async (values: RoleFormValues) => {
    try {
      if (role) await updateRole.mutateAsync({ id: role.id, input: values });
      else await createRole.mutateAsync({ ...values, permissionIds: [] });
      toast.success(role ? 'Papel atualizado com sucesso.' : 'Papel criado com sucesso.');
      close();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ROLE_NAME_EXISTS') {
        setError('name', { message: 'Já existe um papel com este nome.' });
        return;
      }
      toast.error(
        getApiErrorMessage(error, `Não foi possível ${role ? 'atualizar' : 'criar'} o papel.`),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        {role ? (
          <Button aria-label={`Editar ${role.name}`} size="sm" type="button" variant="ghost">
            <Pencil aria-hidden="true" className="size-4" />
            Editar
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden="true" className="size-4" />
            Novo papel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role ? 'Editar papel' : 'Novo papel'}</DialogTitle>
          <DialogDescription>
            {role
              ? 'Atualize os dados descritivos. As permissões possuem um fluxo separado.'
              : 'Crie um agrupamento de acesso para a empresa atual.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-6 space-y-5"
          id={role ? `edit-role-${role.id}` : 'create-role-form'}
          noValidate
          onSubmit={handleSubmit(submit)}
        >
          <div className="space-y-1.5">
            <Label htmlFor={role ? `role-name-${role.id}` : 'role-name'}>Nome</Label>
            <Input
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              disabled={role?.isSystem}
              id={role ? `role-name-${role.id}` : 'role-name'}
            />
            {role?.isSystem ? (
              <p className="text-xs text-slate-500">O nome do papel do sistema é protegido.</p>
            ) : null}
            {errors.name ? <p className="text-sm text-red-700">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={role ? `role-description-${role.id}` : 'role-description'}>
              Descrição
            </Label>
            <Textarea
              {...register('description')}
              aria-invalid={Boolean(errors.description)}
              id={role ? `role-description-${role.id}` : 'role-description'}
            />
            {errors.description ? (
              <p className="text-sm text-red-700">{errors.description.message}</p>
            ) : null}
          </div>
        </form>
        <DialogFooter>
          <Button onClick={close} type="button" variant="outline">
            Cancelar
          </Button>
          <Button
            disabled={mutationPending}
            form={role ? `edit-role-${role.id}` : 'create-role-form'}
            type="submit"
          >
            {mutationPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
