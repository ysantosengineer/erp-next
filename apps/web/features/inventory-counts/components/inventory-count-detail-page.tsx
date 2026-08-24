'use client';

import { ArrowLeft, CheckCircle2, History, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { usePermission } from '../../../components/navigation/can';
import { ErrorState } from '../../../components/shared/data-state';
import { PageHeader } from '../../../components/shared/page-header';
import { Pagination } from '../../../components/shared/pagination';
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
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import {
  useApproveInventoryCount,
  useCancelInventoryCount,
  useInventoryCount,
  useRequestInventoryRecount,
  useStartInventoryCount,
  useSubmitInventoryCountItem,
  useSubmitInventoryRecount,
} from '../hooks/use-inventory-counts';
import { countQuantitySchema, toCanonicalQuantity } from '../schemas/inventory-count.schema';
import type { InventoryCountItem } from '../types/inventory-count.types';
import { AddInventoryCountItemDialog } from './add-inventory-count-item-dialog';
import { InventoryCountStatusBadge } from './inventory-count-status';

const itemStatus = {
  COUNT_PENDING: { label: 'Contagem pendente', variant: 'muted' },
  RECOUNT_PENDING: { label: 'Recontagem pendente', variant: 'warning' },
  MATCHED: { label: 'Sem divergência', variant: 'success' },
  POSITIVE_DIFFERENCE: { label: 'Divergência positiva', variant: 'default' },
  NEGATIVE_DIFFERENCE: { label: 'Divergência negativa', variant: 'warning' },
} as const;

export function InventoryCountDetailPage({ id }: Readonly<{ id: string }>) {
  const canCreate = usePermission(PERMISSIONS.INVENTORY_COUNTS_CREATE);
  const canCount = usePermission(PERMISSIONS.INVENTORY_COUNTS_COUNT);
  const canRecount = usePermission(PERMISSIONS.INVENTORY_COUNTS_RECOUNT);
  const canApprove = usePermission(PERMISSIONS.INVENTORY_COUNTS_APPROVE);
  const canCancel = usePermission(PERMISSIONS.INVENTORY_COUNTS_CANCEL);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search.trim());
  const params = useMemo(
    () => ({ itemsPage: page, itemsLimit: 50, ...(debounced ? { itemSearch: debounced } : {}) }),
    [debounced, page],
  );
  const query = useInventoryCount(id, params);
  const start = useStartInventoryCount();
  const requestRecount = useRequestInventoryRecount();
  const approve = useApproveInventoryCount();
  const cancel = useCancelInventoryCount();
  const countItem = useSubmitInventoryCountItem();
  const recountItem = useSubmitInventoryRecount();

  const execute = async (
    operation: () => Promise<unknown>,
    successMessage: string,
    fallback: string,
  ) => {
    try {
      await operation();
      toast.success(successMessage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, fallback));
    }
  };

  if (query.isLoading)
    return (
      <div className="space-y-5" data-testid="inventory-count-loading">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  if (query.isError || !query.data)
    return (
      <ErrorState
        message={getApiErrorMessage(query.error, 'Não foi possível carregar o inventário.')}
        onRetry={() => void query.refetch()}
      />
    );

  const count = query.data;
  const progress = count.summary.totalItems
    ? Math.round((count.summary.countedItems / count.summary.totalItems) * 100)
    : 0;
  const canEditFirstCount = count.status === 'IN_PROGRESS' && canCount;
  const canEditRecount = count.status === 'RECOUNT_REQUIRED' && canRecount;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Inventário físico"
        title={`${count.warehouse.code} · ${count.warehouse.name}`}
        description={count.description ?? 'Contagem física por depósito.'}
        action={
          <Button asChild variant="outline">
            <Link href="/inventory/counts">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        }
      />
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <InventoryCountStatusBadge status={count.status} />
            <p className="text-sm text-slate-600">Criado por {count.createdBy.name}</p>
            <p className="text-sm text-slate-600">
              Progresso:{' '}
              <strong>
                {count.summary.countedItems}/{count.summary.totalItems} itens · {progress}%
              </strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {count.status === 'DRAFT' && canCreate ? (
              <ConfirmAction
                label="Iniciar inventário"
                title="Capturar saldo e iniciar?"
                description="O saldo atual será preservado como snapshot e o depósito ficará bloqueado para movimentações até aprovação ou cancelamento."
                pending={start.isPending}
                onConfirm={() =>
                  execute(
                    () => start.mutateAsync({ id }),
                    'Inventário iniciado e snapshot capturado.',
                    'Não foi possível iniciar o inventário.',
                  )
                }
              />
            ) : null}
            {count.status === 'IN_PROGRESS' && canCount ? (
              <AddInventoryCountItemDialog inventoryCountId={id} warehouseId={count.warehouse.id} />
            ) : null}
            {count.status === 'IN_PROGRESS' && canRecount ? (
              <ConfirmAction
                label="Concluir primeira contagem"
                title="Verificar divergências?"
                description="Todos os itens precisam estar contados. Divergências serão encaminhadas para recontagem."
                pending={requestRecount.isPending}
                onConfirm={() =>
                  execute(
                    () => requestRecount.mutateAsync({ id }),
                    'Primeira contagem concluída.',
                    'Não foi possível concluir a contagem.',
                  )
                }
              />
            ) : null}
            {count.status === 'READY_FOR_APPROVAL' &&
            canRecount &&
            count.summary.divergentItems > 0 ? (
              <ConfirmAction
                label="Reabrir recontagem"
                title="Reabrir itens divergentes?"
                description="As recontagens atuais dos itens divergentes serão limpas e deverão ser registradas novamente."
                pending={requestRecount.isPending}
                onConfirm={() =>
                  execute(
                    () => requestRecount.mutateAsync({ id }),
                    'Recontagem reaberta.',
                    'Não foi possível reabrir a recontagem.',
                  )
                }
              />
            ) : null}
            {count.status === 'READY_FOR_APPROVAL' && canApprove ? (
              <ConfirmAction
                label="Aprovar inventário"
                title="Gerar ajustes e aprovar?"
                description={`Itens: ${count.summary.totalItems}. Sem divergência: ${count.summary.totalItems - count.summary.positiveDifferences - count.summary.negativeDifferences}. Ajustes positivos: ${count.summary.positiveDifferences}. Ajustes negativos: ${count.summary.negativeDifferences}. A operação gerará movimentações de estoque e não poderá ser desfeita.`}
                pending={approve.isPending}
                emphasis="approve"
                onConfirm={() =>
                  execute(
                    () => approve.mutateAsync({ id }),
                    'Inventário aprovado e saldos ajustados.',
                    'Não foi possível aprovar o inventário.',
                  )
                }
              />
            ) : null}
            {!['APPROVED', 'CANCELLED'].includes(count.status) && canCancel ? (
              <ConfirmAction
                label="Cancelar"
                title="Cancelar inventário?"
                description="As contagens serão preservadas no histórico, nenhum ajuste será criado e o inventário não poderá ser retomado."
                pending={cancel.isPending}
                emphasis="cancel"
                onConfirm={() =>
                  execute(
                    () => cancel.mutateAsync({ id }),
                    'Inventário cancelado sem alterar saldos.',
                    'Não foi possível cancelar o inventário.',
                  )
                }
              />
            ) : null}
          </div>
        </div>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
          aria-label={`Progresso ${progress}%`}
        >
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Itens" value={count.summary.totalItems} />
        <SummaryCard label="Contados" value={count.summary.countedItems} />
        <SummaryCard label="Divergentes" value={count.summary.divergentItems} />
        <SummaryCard label="Recontagens pendentes" value={count.summary.recountPendingItems} />
        <SummaryCard label="Ajustes positivos" value={count.summary.positiveDifferences} />
        <SummaryCard label="Ajustes negativos" value={count.summary.negativeDifferences} />
      </section>
      {count.status === 'APPROVED' ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="size-5" />
            Aprovação concluída com {count.movements.length} movimentações de ajuste.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/inventory/movements">
              <History className="size-4" />
              Ver movimentações
            </Link>
          </Button>
        </section>
      ) : null}
      <section className="space-y-3">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Pesquisar itens do inventário"
            className="pl-9"
            placeholder="Produto, SKU ou endereço"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {!count.items.data.length ? (
            <div className="p-8 text-center text-sm text-slate-600">
              {count.status === 'DRAFT'
                ? 'Inicie o inventário para gerar os itens de contagem.'
                : 'Nenhum item corresponde à pesquisa.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead className="text-right">Sistema</TableHead>
                      <TableHead>1ª contagem</TableHead>
                      <TableHead>Recontagem</TableHead>
                      <TableHead className="text-right">Final</TableHead>
                      <TableHead className="text-right">Divergência</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {count.items.data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium text-slate-950">{item.product.name}</p>
                          <p className="text-xs text-slate-500">{item.product.sku}</p>
                        </TableCell>
                        <TableCell>{item.location.code}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.systemQuantity}
                        </TableCell>
                        <TableCell>
                          {canEditFirstCount ? (
                            <InlineQuantityInput
                              ariaLabel={`Primeira contagem de ${item.product.name}`}
                              initialValue={item.firstCountQuantity ?? ''}
                              pending={countItem.isPending}
                              onSubmit={(quantity) =>
                                execute(
                                  () =>
                                    countItem.mutateAsync({
                                      id,
                                      itemId: item.id,
                                      input: { quantity },
                                    }),
                                  'Contagem registrada.',
                                  'Não foi possível registrar a contagem.',
                                )
                              }
                            />
                          ) : (
                            <span className="tabular-nums">{item.firstCountQuantity ?? '—'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {canEditRecount && item.status === 'RECOUNT_PENDING' ? (
                            <InlineQuantityInput
                              ariaLabel={`Recontagem de ${item.product.name}`}
                              initialValue={item.recountQuantity ?? ''}
                              pending={recountItem.isPending}
                              onSubmit={(quantity) =>
                                execute(
                                  () =>
                                    recountItem.mutateAsync({
                                      id,
                                      itemId: item.id,
                                      input: { quantity },
                                    }),
                                  'Recontagem registrada.',
                                  'Não foi possível registrar a recontagem.',
                                )
                              }
                            />
                          ) : (
                            <span className="tabular-nums">{item.recountQuantity ?? '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.finalCountQuantity ?? '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatDifference(item.differenceQuantity)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={itemStatus[item.status].variant}>
                            {itemStatus[item.status].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                itemLabel="itens"
                onPageChange={setPage}
                page={count.items.meta.page}
                pageSize={count.items.meta.limit}
                total={count.items.meta.total}
                totalPages={count.items.meta.totalPages}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

function InlineQuantityInput({
  ariaLabel,
  initialValue,
  pending,
  onSubmit,
}: Readonly<{
  ariaLabel: string;
  initialValue: string;
  pending: boolean;
  onSubmit: (quantity: string) => Promise<void>;
}>) {
  const [value, setValue] = useState(initialValue);
  return (
    <form
      className="flex min-w-40 gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const result = countQuantitySchema.safeParse({ quantity: value });
        if (!result.success) {
          toast.error(result.error.issues[0]?.message ?? 'Quantidade inválida.');
          return;
        }
        void onSubmit(toCanonicalQuantity(result.data.quantity));
      }}
    >
      <Input
        aria-label={ariaLabel}
        className="h-8 w-24 tabular-nums"
        disabled={pending}
        inputMode="decimal"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button size="sm" type="submit" disabled={pending}>
        Salvar
      </Button>
    </form>
  );
}

function ConfirmAction({
  label,
  title,
  description,
  pending,
  emphasis = 'default',
  onConfirm,
}: Readonly<{
  label: string;
  title: string;
  description: string;
  pending: boolean;
  emphasis?: 'default' | 'approve' | 'cancel';
  onConfirm: () => Promise<void>;
}>) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant={
            emphasis === 'cancel' ? 'destructive' : emphasis === 'default' ? 'outline' : 'default'
          }
          disabled={pending}
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            className={emphasis === 'approve' ? 'bg-blue-600 hover:bg-blue-700' : undefined}
            onClick={() => void onConfirm()}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const formatDifference = (value: string | null) => {
  if (!value) return '—';
  return Number(value) > 0 ? `+${value}` : value;
};
