'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { ApiError } from '../../../lib/api/api-error';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { useRoles } from '../../roles/hooks/use-roles';
import { useCreateUser } from '../hooks/use-users';
import { createUserSchema, type CreateUserFormValues } from '../schemas/user.schema';
import { RoleCheckboxList } from './role-checkbox-list';

export function CreateUserDialog({ canAssignRoles }: Readonly<{ canAssignRoles: boolean }>) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const roles = useRoles(open && canAssignRoles);
  const createUser = useCreateUser();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', password: '', roleIds: [] },
  });
  const selectedRoleIds = useWatch({ control, name: 'roleIds' });

  const close = () => {
    reset();
    setShowPassword(false);
    setOpen(false);
  };

  const submit = async (values: CreateUserFormValues) => {
    try {
      await createUser.mutateAsync({ ...values, roleIds: canAssignRoles ? values.roleIds : [] });
      toast.success('Usuário criado com sucesso.');
      close();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_EXISTS') {
        setError('email', { message: 'Este e-mail já está sendo utilizado.' });
        return;
      }
      toast.error(getApiErrorMessage(error, 'Não foi possível criar o usuário.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" className="size-4" />
          Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            Cadastre o acesso inicial à empresa. A senha não será armazenada no navegador.
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-6 space-y-5"
          id="create-user-form"
          noValidate
          onSubmit={handleSubmit(submit)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="create-user-name">Nome</Label>
            <Input
              {...register('name')}
              aria-describedby={errors.name ? 'create-user-name-error' : undefined}
              aria-invalid={Boolean(errors.name)}
              autoComplete="name"
              id="create-user-name"
            />
            {errors.name ? (
              <p className="text-sm text-red-700" id="create-user-name-error">
                {errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-user-email">E-mail</Label>
            <Input
              {...register('email')}
              aria-describedby={errors.email ? 'create-user-email-error' : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              id="create-user-email"
              type="email"
            />
            {errors.email ? (
              <p className="text-sm text-red-700" id="create-user-email-error">
                {errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-user-password">Senha inicial</Label>
            <div className="relative">
              <Input
                {...register('password')}
                aria-describedby={errors.password ? 'create-user-password-error' : undefined}
                aria-invalid={Boolean(errors.password)}
                autoComplete="new-password"
                className="pr-24"
                id="create-user-password"
                type={showPassword ? 'text' : 'password'}
              />
              <button
                className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.password ? (
              <p className="text-sm text-red-700" id="create-user-password-error">
                {errors.password.message}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Use entre 12 e 128 caracteres.</p>
            )}
          </div>
          {canAssignRoles ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">Papéis</legend>
              {roles.isLoading ? (
                <p className="text-sm text-slate-500">Carregando papéis…</p>
              ) : roles.isError ? (
                <p className="text-sm text-red-700">Não foi possível carregar os papéis.</p>
              ) : (
                <RoleCheckboxList
                  roles={roles.data ?? []}
                  selectedIds={selectedRoleIds}
                  onChange={(roleIds) => setValue('roleIds', roleIds, { shouldValidate: true })}
                />
              )}
            </fieldset>
          ) : null}
        </form>
        <DialogFooter>
          <Button onClick={close} type="button" variant="outline">
            Cancelar
          </Button>
          <Button disabled={createUser.isPending} form="create-user-form" type="submit">
            {createUser.isPending ? 'Criando…' : 'Criar usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
