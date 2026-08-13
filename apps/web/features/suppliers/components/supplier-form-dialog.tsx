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
import { useCreateSupplier, useUpdateSupplier } from '../hooks/use-suppliers';
import {
  emptySupplierForm,
  formatDocument,
  formatPhone,
  formatPostalCode,
  supplierSchema,
  toSupplierInput,
  type SupplierFormValues,
} from '../schemas/supplier.schema';
import type { Supplier } from '../types/supplier.types';
const fromSupplier = (s?: Supplier): SupplierFormValues =>
  s
    ? {
        type: s.type,
        name: s.name,
        tradeName: s.tradeName ?? '',
        document: formatDocument(s.document),
        email: s.email ?? '',
        phone: s.phone ? formatPhone(s.phone) : '',
        contactName: s.contactName ?? '',
        notes: s.notes ?? '',
        address: {
          postalCode: s.address?.postalCode ? formatPostalCode(s.address.postalCode) : '',
          street: s.address?.street ?? '',
          number: s.address?.number ?? '',
          complement: s.address?.complement ?? '',
          district: s.address?.district ?? '',
          city: s.address?.city ?? '',
          state: s.address?.state ?? '',
          country: s.address?.country ?? 'BR',
        },
      }
    : emptySupplierForm();
export function SupplierFormDialog({ supplier }: Readonly<{ supplier?: Supplier }>) {
  const [open, setOpen] = useState(false),
    create = useCreateSupplier(),
    update = useUpdateSupplier(),
    editing = Boolean(supplier);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: fromSupplier(supplier),
  });
  const type = useWatch({ control, name: 'type' });
  useEffect(() => reset(fromSupplier(supplier)), [reset, supplier]);
  const close = () => {
    reset(fromSupplier(supplier));
    setOpen(false);
  };
  const submit = async (values: SupplierFormValues) => {
    try {
      const input = toSupplierInput(values, editing);
      if (supplier) await update.mutateAsync({ id: supplier.id, input });
      else await create.mutateAsync(input);
      toast.success(
        editing ? 'Fornecedor atualizado com sucesso.' : 'Fornecedor criado com sucesso.',
      );
      close();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SUPPLIER_DOCUMENT_EXISTS') {
        setError('document', { message: 'Este documento já está cadastrado na empresa.' });
        return;
      }
      toast.error(getApiErrorMessage(e, 'Não foi possível salvar o fornecedor.'));
    }
  };
  const err = (m?: string) => (m ? <p className="text-sm text-red-700">{m}</p> : null),
    prefix = supplier ? `edit-${supplier.id}` : 'create-supplier';
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button size={supplier ? 'sm' : 'default'} variant={supplier ? 'ghost' : 'default'}>
          {supplier ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {supplier ? 'Editar' : 'Novo fornecedor'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
          <DialogDescription>
            Informe dados fiscais, contato e endereço principal.
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
                    onValueChange={(v) => {
                      field.onChange(v);
                      setValue('document', '');
                    }}
                  >
                    <SelectTrigger aria-label="Tipo de fornecedor">
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
                onChange={(e) =>
                  setValue('document', formatDocument(e.target.value), { shouldValidate: true })
                }
              />
              {err(errors.document?.message)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-name`}>
                {type === 'INDIVIDUAL' ? 'Nome completo' : 'Razão social'}
              </Label>
              <Input id={`${prefix}-name`} {...register('name')} />
              {err(errors.name?.message)}
            </div>
            {type === 'COMPANY' ? (
              <div className="space-y-1.5">
                <Label htmlFor={`${prefix}-trade`}>Nome fantasia</Label>
                <Input id={`${prefix}-trade`} {...register('tradeName')} />
              </div>
            ) : null}
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-semibold">Contato</legend>
            <div>
              <Label htmlFor={`${prefix}-email`}>E-mail</Label>
              <Input id={`${prefix}-email`} type="email" {...register('email')} />
              {err(errors.email?.message)}
            </div>
            <div>
              <Label htmlFor={`${prefix}-phone`}>Telefone</Label>
              <Input
                id={`${prefix}-phone`}
                {...register('phone')}
                onChange={(e) => setValue('phone', formatPhone(e.target.value))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`${prefix}-contact`}>Contato responsável</Label>
              <Input id={`${prefix}-contact`} {...register('contactName')} />
            </div>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-6">
            <legend className="mb-3 font-semibold">Endereço principal</legend>
            <div className="sm:col-span-2">
              <Label htmlFor={`${prefix}-cep`}>CEP</Label>
              <Input
                id={`${prefix}-cep`}
                {...register('address.postalCode')}
                onChange={(e) =>
                  setValue('address.postalCode', formatPostalCode(e.target.value), {
                    shouldValidate: true,
                  })
                }
              />
              {err(errors.address?.postalCode?.message)}
            </div>
            <div className="sm:col-span-4">
              <Label htmlFor={`${prefix}-street`}>Logradouro</Label>
              <Input id={`${prefix}-street`} {...register('address.street')} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`${prefix}-number`}>Número</Label>
              <Input id={`${prefix}-number`} {...register('address.number')} />
            </div>
            <div className="sm:col-span-4">
              <Label htmlFor={`${prefix}-complement`}>Complemento</Label>
              <Input id={`${prefix}-complement`} {...register('address.complement')} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`${prefix}-district`}>Bairro</Label>
              <Input id={`${prefix}-district`} {...register('address.district')} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`${prefix}-city`}>Cidade</Label>
              <Input id={`${prefix}-city`} {...register('address.city')} />
            </div>
            <div>
              <Label htmlFor={`${prefix}-state`}>UF</Label>
              <Input
                id={`${prefix}-state`}
                maxLength={2}
                {...register('address.state')}
                onChange={(e) =>
                  setValue('address.state', e.target.value.toUpperCase(), { shouldValidate: true })
                }
              />
              {err(errors.address?.state?.message)}
            </div>
            <div>
              <Label htmlFor={`${prefix}-country`}>País</Label>
              <Input id={`${prefix}-country`} maxLength={2} {...register('address.country')} />
            </div>
          </fieldset>
          <div>
            <Label htmlFor={`${prefix}-notes`}>Observações</Label>
            <Textarea id={`${prefix}-notes`} {...register('notes')} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button form={prefix} type="submit" disabled={create.isPending || update.isPending}>
            Salvar fornecedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
