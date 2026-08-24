'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
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
import { formatCurrency, normalizeDecimal } from '../../../lib/decimal';
import { cn } from '../../../lib/utils';
import {
  useCreateSalesOrder,
  useSalesOrder,
  useSalesOrderOptions,
  useUpdateSalesOrder,
} from '../hooks/use-sales-orders';
import {
  emptySalesOrder,
  salesOrderSchema,
  type SalesOrderFormValues,
} from '../schemas/sales-order.schema';
import type { SalesOrder, SalesOrderInput } from '../types/sales-order.types';

const numeric = (value?: string) => {
  const parsed = Number(normalizeDecimal(value || '0'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const orderToFormValues = (order: SalesOrder): SalesOrderFormValues => ({
  customerId: order.customer.id,
  warehouseId: order.warehouse.id,
  orderDate: order.orderDate,
  expectedDeliveryDate: order.expectedDeliveryDate ?? '',
  notes: order.notes ?? '',
  discountAmount: order.discountAmount.replace('.', ','),
  freightAmount: order.freightAmount.replace('.', ','),
  otherAmount: order.otherAmount.replace('.', ','),
  items: order.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity.replace('.', ','),
    unitPrice: item.unitPrice.replace('.', ','),
    discountAmount: item.discountAmount.replace('.', ','),
  })),
});

export function SalesOrderFormPage({ orderId }: { orderId?: string }) {
  const editing = Boolean(orderId);
  const router = useRouter();
  const detail = useSalesOrder(orderId);

  if (editing && detail.isLoading) return <Skeleton className="h-[600px]" />;
  if (editing && detail.isError) {
    return (
      <ErrorState
        message="Não foi possível carregar o pedido."
        onRetry={() => void detail.refetch()}
      />
    );
  }
  if (detail.data && detail.data.status !== 'DRAFT') {
    return (
      <ErrorState
        message="Somente pedidos em rascunho podem ser editados."
        onRetry={() => router.push(`/sales/orders/${detail.data.id}`)}
      />
    );
  }

  return <SalesOrderForm key={detail.data?.id ?? 'new'} order={detail.data} orderId={orderId} />;
}

function SalesOrderForm({ orderId, order }: { orderId?: string; order?: SalesOrder }) {
  const editing = Boolean(orderId);
  const router = useRouter();
  const create = useCreateSalesOrder();
  const update = useUpdateSalesOrder();
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const options = useSalesOrderOptions(productSearch);
  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: order ? orderToFormValues(order) : emptySalesOrder(),
  });
  const fields = useFieldArray({ control: form.control, name: 'items' });

  const items = useWatch({ control: form.control, name: 'items', defaultValue: [] });
  const customerId = useWatch({ control: form.control, name: 'customerId' });
  const generalDiscount = useWatch({
    control: form.control,
    name: 'discountAmount',
    defaultValue: '0',
  });
  const freight = useWatch({ control: form.control, name: 'freightAmount', defaultValue: '0' });
  const other = useWatch({ control: form.control, name: 'otherAmount', defaultValue: '0' });
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Math.max(
            0,
            numeric(item.quantity) * numeric(item.unitPrice) - numeric(item.discountAmount),
          ),
        0,
      ),
    [items],
  );
  const total = Math.max(
    0,
    subtotal - numeric(generalDiscount) + numeric(freight) + numeric(other),
  );
  const selectedCustomer =
    options.data?.customers.find((customer) => customer.id === customerId) ??
    (order?.customer.id === customerId ? order.customer : undefined);
  const exceedsCreditLimit =
    Boolean(selectedCustomer) && total > Number(selectedCustomer?.creditLimit ?? '0');

  const addProduct = () => {
    const product = options.data?.products.find((item) => item.id === selectedProduct);
    if (!product) return;
    if (items.some((item) => item.productId === product.id)) {
      toast.error('Este produto já está no pedido. Edite a linha existente.');
      return;
    }
    fields.append({
      productId: product.id,
      quantity: '1,0000',
      unitPrice: product.suggestedUnitPrice.replace('.', ','),
      discountAmount: '0,00',
    });
    setSelectedProduct('');
  };

  const submit = async (raw: SalesOrderFormValues) => {
    try {
      const parsed = salesOrderSchema.parse(raw);
      const input: SalesOrderInput = {
        ...parsed,
        expectedDeliveryDate: parsed.expectedDeliveryDate || null,
        notes: parsed.notes || null,
      };
      const saved = orderId
        ? await update.mutateAsync({ id: orderId, input })
        : await create.mutateAsync(input);
      toast.success(editing ? 'Pedido atualizado.' : 'Pedido criado como rascunho.');
      router.push(`/sales/orders/${saved.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o pedido.'));
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendas"
        title={editing ? `Editar ${order?.number ?? 'pedido'}` : 'Novo pedido de venda'}
        description="O pedido será salvo como rascunho. Nenhum saldo será reservado ou baixado."
        action={
          <Link
            className={cn(buttonVariants({ variant: 'outline' }))}
            href={orderId ? `/sales/orders/${orderId}` : '/sales/orders'}
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        }
      />
      <form className="space-y-6" noValidate onSubmit={form.handleSubmit(submit)}>
        <Section title="Cliente e origem">
          <Field label="Cliente" error={form.formState.errors.customerId?.message}>
            <Controller
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Cliente">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.data?.customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} — {customer.document} — limite{' '}
                        {formatCurrency(customer.creditLimit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Depósito de origem" error={form.formState.errors.warehouseId?.message}>
            <Controller
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Depósito de origem">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.data?.warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Data do pedido" error={form.formState.errors.orderDate?.message}>
            <Input aria-label="Data do pedido" type="date" {...form.register('orderDate')} />
          </Field>
          <Field label="Previsão de entrega">
            <Input
              aria-label="Previsão de entrega"
              type="date"
              {...form.register('expectedDeliveryDate')}
            />
          </Field>
        </Section>

        <Section title="Itens">
          <div className="col-span-full grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Input
              aria-label="Pesquisar produto"
              placeholder="Nome ou SKU"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
            />
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger aria-label="Produto">
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {options.data?.products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} — {product.sku} ({product.unitSymbol}) —{' '}
                    {formatCurrency(product.suggestedUnitPrice)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addProduct} type="button">
              <Plus className="size-4" /> Adicionar
            </Button>
          </div>
          <div className="col-span-full overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Produto</th>
                  <th className="p-2">Quantidade</th>
                  <th className="p-2">Preço unitário</th>
                  <th className="p-2">Desconto</th>
                  <th className="p-2">Subtotal</th>
                  <th>
                    <span className="sr-only">Remover</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.fields.map((field, index) => {
                  const product =
                    options.data?.products.find((item) => item.id === items[index]?.productId) ??
                    order?.items.find((item) => item.productId === field.productId);
                  const productName =
                    product && 'productName' in product ? product.productName : product?.name;
                  const productSku =
                    product && 'productSku' in product ? product.productSku : product?.sku;
                  const line = Math.max(
                    0,
                    numeric(items[index]?.quantity) * numeric(items[index]?.unitPrice) -
                      numeric(items[index]?.discountAmount),
                  );
                  return (
                    <tr className="border-b" key={field.id}>
                      <td className="p-2">
                        <span className="font-medium">{productName ?? 'Produto'}</span>
                        <br />
                        <span className="font-mono text-slate-500">{productSku}</span>
                      </td>
                      <td className="p-2">
                        <Input
                          aria-label={`Quantidade do item ${index + 1}`}
                          inputMode="decimal"
                          {...form.register(`items.${index}.quantity`)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          aria-label={`Preço do item ${index + 1}`}
                          inputMode="decimal"
                          {...form.register(`items.${index}.unitPrice`)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          aria-label={`Desconto do item ${index + 1}`}
                          inputMode="decimal"
                          {...form.register(`items.${index}.discountAmount`)}
                        />
                        {form.formState.errors.items?.[index]?.discountAmount?.message ? (
                          <p className="mt-1 text-xs text-red-700">
                            {form.formState.errors.items[index]?.discountAmount?.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-2">{formatCurrency(line.toFixed(2))}</td>
                      <td>
                        <Button
                          aria-label={`Remover item ${index + 1}`}
                          onClick={() => fields.remove(index)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {form.formState.errors.items?.root?.message ? (
              <p className="mt-2 text-sm text-red-700">
                {form.formState.errors.items.root.message}
              </p>
            ) : null}
          </div>
        </Section>

        <Section title="Valores e resumo">
          <Field label="Desconto geral (R$)" error={form.formState.errors.discountAmount?.message}>
            <Input
              aria-label="Desconto geral"
              inputMode="decimal"
              {...form.register('discountAmount')}
            />
          </Field>
          <Field label="Frete (R$)">
            <Input aria-label="Frete" inputMode="decimal" {...form.register('freightAmount')} />
          </Field>
          <Field label="Outros valores (R$)">
            <Input
              aria-label="Outros valores"
              inputMode="decimal"
              {...form.register('otherAmount')}
            />
          </Field>
          <div className="rounded-lg bg-slate-50 p-4">
            <p>
              Subtotal líquido dos itens: <strong>{formatCurrency(subtotal.toFixed(2))}</strong>
            </p>
            <p className="mt-2 text-lg">
              Total: <strong>{formatCurrency(total.toFixed(2))}</strong>
            </p>
          </div>
          {selectedCustomer ? (
            <div className="col-span-full rounded-lg border p-3 text-sm">
              Limite cadastrado: <strong>{formatCurrency(selectedCustomer.creditLimit)}</strong>
              {exceedsCreditLimit ? (
                <p className="mt-1 text-amber-700" role="status">
                  O total deste pedido supera o limite de crédito cadastrado. Este aviso é
                  informativo e não representa crédito disponível.
                </p>
              ) : null}
            </div>
          ) : null}
          <Field className="col-span-full" label="Observações">
            <Textarea aria-label="Observações" rows={4} {...form.register('notes')} />
          </Field>
        </Section>
        <div className="flex justify-end">
          <Button disabled={pending || options.isLoading} type="submit">
            <Save className="size-4" /> {pending ? 'Salvando…' : 'Salvar rascunho'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border bg-white p-5 shadow-sm">
      <legend className="sr-only">{title}</legend>
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
