'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
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
import { ApiError } from '../../../lib/api/api-error';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { useUpdateUser } from '../hooks/use-users';
import { updateUserSchema, type UpdateUserFormValues } from '../schemas/user.schema';
import type { User } from '../types/user.types';

export function EditUserDialog({ user }: Readonly<{ user: User }>) {
  const [open, setOpen] = useState(false);
  const updateUser = useUpdateUser();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: user.name, email: user.email },
  });

  useEffect(() => reset({ name: user.name, email: user.email }), [reset, user.email, user.name]);

  const submit = async (values: UpdateUserFormValues) => {
    try {
      await updateUser.mutateAsync({ id: user.id, input: values });
      toast.success('Usuário atualizado com sucesso.');
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_EXISTS') {
        setError('email', { message: 'Este e-mail já está sendo utilizado.' });
        return;
      }
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o usuário.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button aria-label={`Editar ${user.name}`} size="sm" type="button" variant="ghost">
          <Pencil aria-hidden="true" className="size-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Atualize somente nome e e-mail. Status e papéis possuem fluxos próprios.
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-6 space-y-5"
          id={`edit-user-${user.id}`}
          noValidate
          onSubmit={handleSubmit(submit)}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${user.id}`}>Nome</Label>
            <Input
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              id={`edit-name-${user.id}`}
            />
            {errors.name ? <p className="text-sm text-red-700">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-email-${user.id}`}>E-mail</Label>
            <Input
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              id={`edit-email-${user.id}`}
              type="email"
            />
            {errors.email ? <p className="text-sm text-red-700">{errors.email.message}</p> : null}
          </div>
        </form>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} type="button" variant="outline">
            Cancelar
          </Button>
          <Button disabled={updateUser.isPending} form={`edit-user-${user.id}`} type="submit">
            {updateUser.isPending ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
