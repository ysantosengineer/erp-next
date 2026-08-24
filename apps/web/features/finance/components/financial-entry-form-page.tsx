'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { Button, buttonVariants } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Skeleton } from '../../../components/ui/skeleton';
import { Textarea } from '../../../components/ui/textarea';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { cn } from '../../../lib/utils';
import {
  useCreateFinancialEntry,
  useFinanceOptions,
  useFinancialEntry,
  useUpdateFinancialEntry,
} from '../hooks/use-finance';
import { financialEntrySchema, type FinancialEntryFormValues } from '../schemas/finance.schema';
import type {
  FinancialEntry,
  FinancialEntryInput,
  FinancialEntryType,
} from '../types/finance.types';

const today = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const values = (entry?: FinancialEntry): FinancialEntryFormValues => ({
  description: entry?.description ?? '',
  documentNumber: entry?.documentNumber ?? '',
  partyId: entry?.supplier?.id ?? entry?.customer?.id ?? '',
  issueDate: entry?.issueDate ?? today(),
  dueDate: entry?.dueDate ?? today(),
  originalAmount: entry?.originalAmount.replace('.', ',') ?? '',
  notes: entry?.notes ?? '',
});

export function FinancialEntryFormPage({
  type,
  entryId,
}: {
  type?: FinancialEntryType;
  entryId?: string;
}) {
  const detail = useFinancialEntry(entryId);
  if (entryId && detail.isLoading) return <Skeleton className="h-[520px]" />;
  if (entryId && detail.isError)
    return (
      <ErrorState
        message="Não foi possível carregar o título."
        onRetry={() => void detail.refetch()}
      />
    );
  if (detail.data && (detail.data.status !== 'OPEN' || detail.data.settledAmount !== '0.00'))
    return (
      <ErrorState
        message="Somente títulos em aberto e sem liquidações podem ser editados."
        onRetry={() => undefined}
      />
    );
  const resolvedType = detail.data?.type ?? type;
  if (!resolvedType) return null;
  return (
    <FinancialEntryForm
      key={detail.data?.id ?? resolvedType}
      type={resolvedType}
      entry={detail.data}
    />
  );
}

function FinancialEntryForm({ type, entry }: { type: FinancialEntryType; entry?: FinancialEntry }) {
  const payable = type === 'PAYABLE';
  const router = useRouter();
  const options = useFinanceOptions();
  const create = useCreateFinancialEntry();
  const update = useUpdateFinancialEntry();
  const form = useForm<FinancialEntryFormValues>({
    resolver: zodResolver(financialEntrySchema),
    defaultValues: values(entry),
  });
  const back = entry
    ? `/finance/entries/${entry.id}`
    : `/finance/${payable ? 'payables' : 'receivables'}`;
  const submit = async (raw: FinancialEntryFormValues) => {
    try {
      const parsed = financialEntrySchema.parse(raw);
      const input: FinancialEntryInput = {
        type,
        description: parsed.description,
        documentNumber: parsed.documentNumber || null,
        supplierId: payable ? parsed.partyId || null : null,
        customerId: payable ? null : parsed.partyId || null,
        issueDate: parsed.issueDate,
        dueDate: parsed.dueDate,
        originalAmount: parsed.originalAmount,
        notes: parsed.notes || null,
      };
      const saved = entry
        ? await update.mutateAsync({
            id: entry.id,
            input: {
              description: input.description,
              documentNumber: input.documentNumber,
              supplierId: input.supplierId,
              customerId: input.customerId,
              issueDate: input.issueDate,
              dueDate: input.dueDate,
              originalAmount: input.originalAmount,
              notes: input.notes,
            },
          })
        : await create.mutateAsync(input);
      toast.success(entry ? 'Título atualizado.' : 'Título criado.');
      router.push(`/finance/entries/${saved.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o título.'));
    }
  };
  const errors = form.formState.errors;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title={
          entry ? `Editar ${entry.number}` : payable ? 'Nova conta a pagar' : 'Nova conta a receber'
        }
        description="Cada registro representa um único título ou parcela, com valor e vencimento próprios."
        action={
          <Link className={cn(buttonVariants({ variant: 'outline' }))} href={back}>
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        }
      />
      <form
        className="space-y-6 rounded-xl border bg-white p-6"
        noValidate
        onSubmit={form.handleSubmit(submit)}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Descrição" error={errors.description?.message}>
            <Input {...form.register('description')} />
          </Field>
          <Field label="Documento externo" error={errors.documentNumber?.message}>
            <Input {...form.register('documentNumber')} />
          </Field>
          <Field
            label={payable ? 'Fornecedor (opcional)' : 'Cliente (opcional)'}
            error={errors.partyId?.message}
          >
            <Controller
              control={form.control}
              name="partyId"
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {(payable ? options.data?.suppliers : options.data?.customers)?.map((party) => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.name} — {party.document}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Valor original" error={errors.originalAmount?.message}>
            <Input inputMode="decimal" placeholder="0,00" {...form.register('originalAmount')} />
          </Field>
          <Field label="Data de emissão" error={errors.issueDate?.message}>
            <Input type="date" {...form.register('issueDate')} />
          </Field>
          <Field label="Data de vencimento" error={errors.dueDate?.message}>
            <Input type="date" {...form.register('dueDate')} />
          </Field>
        </div>
        <Field label="Observações" error={errors.notes?.message}>
          <Textarea rows={4} {...form.register('notes')} />
        </Field>
        <div className="flex justify-end">
          <Button disabled={create.isPending || update.isPending} type="submit">
            <Save className="size-4" /> Salvar título
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
