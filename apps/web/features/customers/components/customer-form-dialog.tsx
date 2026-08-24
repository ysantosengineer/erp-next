'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { ApiError } from '../../../lib/api/api-error';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { formatDocument, formatPhone, formatPostalCode } from '../../../lib/br-data';
import { useCreateCustomer, useUpdateCustomer } from '../hooks/use-customers';
import {
  customerSchema,
  customerToForm,
  emptyCustomerForm,
  toCustomerInput,
  type CustomerFormValues,
} from '../schemas/customer.schema';
import type { Customer } from '../types/customer.types';

const fromCustomer = (customer?: Customer): CustomerFormValues => {
  if (!customer) return emptyCustomerForm();
  const values = customerToForm(customer);
  return {
    ...values,
    document: formatDocument(values.document),
    phone: values.phone ? formatPhone(values.phone) : '',
    address: {
      ...values.address,
      postalCode: values.address.postalCode ? formatPostalCode(values.address.postalCode) : '',
    },
  };
};

const FieldError = ({ message }: Readonly<{ message?: string }>) =>
  message ? <p className="text-sm text-red-700">{message}</p> : null;

export function CustomerFormDialog({ customer }: Readonly<{ customer?: Customer }>) {
  const [open, setOpen] = useState(false);
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const editing = Boolean(customer);
  const prefix = customer ? `edit-customer-${customer.id}` : 'create-customer';
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: fromCustomer(customer),
  });
  const type = useWatch({ control, name: 'type' });

  useEffect(() => reset(fromCustomer(customer)), [customer, reset]);

  const close = () => {
    reset(fromCustomer(customer));
    setOpen(false);
  };

  const submit = async (values: CustomerFormValues) => {
    try {
      const input = toCustomerInput(values, editing);
      if (customer) await update.mutateAsync({ id: customer.id, input });
      else await create.mutateAsync(input);
      toast.success(editing ? 'Cliente atualizado com sucesso.' : 'Cliente criado com sucesso.');
      close();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CUSTOMER_DOCUMENT_EXISTS') {
        setError('document', { message: 'Este documento já está cadastrado na empresa.' });
        return;
      }
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o cliente.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button size={customer ? 'sm' : 'default'} variant={customer ? 'ghost' : 'default'}>
          {customer ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {customer ? 'Editar' : 'Novo cliente'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          <DialogDescription>
            Informe identificação, contato, limite de crédito e endereço principal.
          </DialogDescription>
        </DialogHeader>
        <form className="mt-6 space-y-7" id={prefix} noValidate onSubmit={handleSubmit(submit)}>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-semibold">Identificação</legend>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setValue('document', '');
                    }}
                  >
                    <SelectTrigger aria-label="Tipo de cliente">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">Pessoa Física</SelectItem>
                      <SelectItem value="COMPANY">Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-document`}>{type === 'INDIVIDUAL' ? 'CPF' : 'CNPJ'}</Label>
              <Input
                id={`${prefix}-document`}
                {...register('document')}
                onChange={(event) =>
                  setValue('document', formatDocument(event.target.value), { shouldValidate: true })
                }
              />
              <FieldError message={errors.document?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-name`}>
                {type === 'INDIVIDUAL' ? 'Nome completo' : 'Razão social'}
              </Label>
              <Input id={`${prefix}-name`} {...register('name')} />
              <FieldError message={errors.name?.message} />
            </div>
            {type === 'COMPANY' ? (
              <div className="space-y-1.5">
                <Label htmlFor={`${prefix}-trade-name`}>Nome fantasia</Label>
                <Input id={`${prefix}-trade-name`} {...register('tradeName')} />
              </div>
            ) : null}
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-semibold">Contato e crédito</legend>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-email`}>E-mail</Label>
              <Input id={`${prefix}-email`} type="email" {...register('email')} />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-phone`}>Telefone</Label>
              <Input
                id={`${prefix}-phone`}
                {...register('phone')}
                onChange={(event) => setValue('phone', formatPhone(event.target.value))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${prefix}-credit-limit`}>Limite de crédito</Label>
              <Input
                id={`${prefix}-credit-limit`}
                inputMode="decimal"
                placeholder="0,00"
                {...register('creditLimit')}
              />
              <p className="text-xs text-slate-500">Valor em reais, sem arredondamento binário.</p>
              <FieldError message={errors.creditLimit?.message} />
            </div>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-6">
            <legend className="mb-3 font-semibold">Endereço principal</legend>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${prefix}-postal-code`}>CEP</Label>
              <Input
                id={`${prefix}-postal-code`}
                {...register('address.postalCode')}
                onChange={(event) =>
                  setValue('address.postalCode', formatPostalCode(event.target.value), {
                    shouldValidate: true,
                  })
                }
              />
              <FieldError message={errors.address?.postalCode?.message} />
            </div>
            <div className="space-y-1.5 sm:col-span-4">
              <Label htmlFor={`${prefix}-street`}>Logradouro</Label>
              <Input id={`${prefix}-street`} {...register('address.street')} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${prefix}-number`}>Número</Label>
              <Input id={`${prefix}-number`} {...register('address.number')} />
            </div>
            <div className="space-y-1.5 sm:col-span-4">
              <Label htmlFor={`${prefix}-complement`}>Complemento</Label>
              <Input id={`${prefix}-complement`} {...register('address.complement')} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${prefix}-district`}>Bairro</Label>
              <Input id={`${prefix}-district`} {...register('address.district')} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${prefix}-city`}>Cidade</Label>
              <Input id={`${prefix}-city`} {...register('address.city')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-state`}>UF</Label>
              <Input
                id={`${prefix}-state`}
                maxLength={2}
                {...register('address.state')}
                onChange={(event) =>
                  setValue('address.state', event.target.value.toUpperCase(), {
                    shouldValidate: true,
                  })
                }
              />
              <FieldError message={errors.address?.state?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-country`}>País</Label>
              <Input id={`${prefix}-country`} maxLength={2} {...register('address.country')} />
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor={`${prefix}-notes`}>Observações</Label>
            <Textarea id={`${prefix}-notes`} {...register('notes')} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button form={prefix} type="submit" disabled={create.isPending || update.isPending}>
            Salvar cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
