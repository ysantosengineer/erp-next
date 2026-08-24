'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Ban, Pencil, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Textarea } from '../../../components/ui/textarea';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { formatCurrency } from '../../../lib/decimal';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../auth/hooks/use-auth';
import {
  useCancelFinancialEntry,
  useFinancialEntry,
  useSettleFinancialEntry,
} from '../hooks/use-finance';
import { settlementSchema, type SettlementFormValues } from '../schemas/finance.schema';
import type { FinancialPaymentMethod } from '../types/finance.types';
import { FinancialStatus } from './financial-status';

const today = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const methodLabels: Record<FinancialPaymentMethod, string> = {
  CASH: 'Dinheiro',
  BANK_TRANSFER: 'Transferência bancária',
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  BANK_SLIP: 'Boleto',
  CHECK: 'Cheque',
  OTHER: 'Outro',
};

export function FinancialEntryDetailPage({ id }: { id: string }) {
  const query = useFinancialEntry(id);
  const { user } = useAuth();
  const settle = useSettleFinancialEntry();
  const cancel = useCancelFinancialEntry();
  const [reason, setReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: { amount: '', settledAt: today(), paymentMethod: 'PIX', notes: '' },
  });
  if (query.isLoading) return <Skeleton className="h-[600px]" />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        message="Não foi possível carregar o título."
        onRetry={() => void query.refetch()}
      />
    );
  const entry = query.data;
  const back = entry.type === 'PAYABLE' ? '/finance/payables' : '/finance/receivables';
  const eligible = entry.status === 'OPEN' || entry.status === 'PARTIALLY_SETTLED';
  const submitSettlement = async (raw: SettlementFormValues) => {
    try {
      const parsed = settlementSchema.parse(raw);
      await settle.mutateAsync({ id, ...parsed, notes: parsed.notes || undefined, idempotencyKey });
      setIdempotencyKey(crypto.randomUUID());
      form.reset({ amount: '', settledAt: today(), paymentMethod: 'PIX', notes: '' });
      toast.success(entry.type === 'PAYABLE' ? 'Pagamento registrado.' : 'Recebimento registrado.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível registrar a liquidação.'));
    }
  };
  const submitCancel = async () => {
    try {
      await cancel.mutateAsync({ id, reason });
      toast.success('Título cancelado.');
      setReason('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível cancelar o título.'));
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={entry.type === 'PAYABLE' ? 'Conta a pagar' : 'Conta a receber'}
        title={`${entry.number} — ${entry.description}`}
        description={
          entry.documentNumber ? `Documento ${entry.documentNumber}` : 'Título gerado manualmente'
        }
        action={
          <div className="flex gap-2">
            <Link className={cn(buttonVariants({ variant: 'outline' }))} href={back}>
              <ArrowLeft className="size-4" /> Voltar
            </Link>
            {user?.permissions.includes(PERMISSIONS.FINANCE_UPDATE) &&
            entry.status === 'OPEN' &&
            entry.settledAmount === '0.00' ? (
              <Button asChild variant="outline">
                <Link href={`/finance/entries/${entry.id}/edit`}>
                  <Pencil className="size-4" /> Editar
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Valor original" value={formatCurrency(entry.originalAmount)} />
        <Metric label="Liquidado" value={formatCurrency(entry.settledAmount)} />
        <Metric label="Saldo pendente" value={formatCurrency(entry.remainingAmount)} />
        <Metric
          label="Situação"
          value={
            <div className="mt-2">
              <FinancialStatus status={entry.status} overdue={entry.overdue} />
              {entry.overdue ? (
                <span className="ml-2 text-sm text-amber-700">{entry.daysOverdue} dia(s)</span>
              ) : null}
            </div>
          }
        />
      </div>
      <div className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-3">
        <Info
          label="Emissão"
          value={new Date(`${entry.issueDate}T00:00:00`).toLocaleDateString('pt-BR')}
        />
        <Info
          label="Vencimento"
          value={new Date(`${entry.dueDate}T00:00:00`).toLocaleDateString('pt-BR')}
        />
        <Info
          label={entry.type === 'PAYABLE' ? 'Fornecedor' : 'Cliente'}
          value={entry.supplier?.name ?? entry.customer?.name ?? 'Sem vínculo'}
        />
        <Info label="Origem" value={entry.referenceType} />
        <Info label="Criado por" value={entry.createdBy.name} />
        <Info label="Observações" value={entry.notes || '—'} />
        {entry.status === 'CANCELLED' ? (
          <Info label="Motivo do cancelamento" value={entry.cancellationReason ?? '—'} />
        ) : null}
      </div>
      {eligible && user?.permissions.includes(PERMISSIONS.FINANCE_SETTLE) ? (
        <form
          className="space-y-4 rounded-xl border bg-white p-5"
          onSubmit={form.handleSubmit(submitSettlement)}
        >
          <div>
            <h2 className="font-semibold">
              {entry.type === 'PAYABLE' ? 'Registrar pagamento' : 'Registrar recebimento'}
            </h2>
            <p className="text-sm text-slate-500">
              A baixa é imutável. Confira valor, data e método antes de confirmar.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Valor">
              <Input inputMode="decimal" placeholder="0,00" {...form.register('amount')} />
            </Field>
            <Field label="Data">
              <Input type="date" {...form.register('settledAt')} />
            </Field>
            <Field label="Método">
              <Controller
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(methodLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Observação">
              <Input {...form.register('notes')} />
            </Field>
          </div>
          <Button disabled={settle.isPending} type="submit">
            <WalletCards className="size-4" /> Confirmar baixa
          </Button>
        </form>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Histórico de liquidações</h2>
        {entry.settlements.length ? (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.settlements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {new Date(`${item.settledAt}T00:00:00`).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                    <TableCell>{methodLabels[item.paymentMethod]}</TableCell>
                    <TableCell>{item.createdBy.name}</TableCell>
                    <TableCell>{item.notes ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">
            Nenhuma liquidação registrada.
          </p>
        )}
      </section>
      {entry.status === 'OPEN' &&
      entry.settledAmount === '0.00' &&
      user?.permissions.includes(PERMISSIONS.FINANCE_CANCEL) ? (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <div>
            <h2 className="font-semibold text-red-900">Cancelar título</h2>
            <p className="text-sm text-red-700">
              O cancelamento só é permitido antes da primeira baixa.
            </p>
          </div>
          <Textarea
            aria-label="Motivo do cancelamento"
            placeholder="Informe o motivo"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button
            disabled={reason.trim().length < 3 || cancel.isPending}
            variant="outline"
            onClick={() => void submitCancel()}
          >
            <Ban className="size-4" /> Cancelar título
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
