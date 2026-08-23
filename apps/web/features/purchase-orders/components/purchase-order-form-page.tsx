'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
import { formatCurrency, normalizeDecimal } from '../../../lib/decimal';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { cn } from '../../../lib/utils';
import {
  useCreatePurchaseOrder,
  usePurchaseOrder,
  usePurchaseOrderOptions,
  useUpdatePurchaseOrder,
} from '../hooks/use-purchase-orders';
import {
  emptyPurchaseOrder,
  purchaseOrderSchema,
  type PurchaseOrderFormValues,
} from '../schemas/purchase-order.schema';
import type { PurchaseOrderInput } from '../types/purchase-order.types';

const canonical = (value: string) => normalizeDecimal(value || '0');
export function PurchaseOrderFormPage({ orderId }: { orderId?: string }) {
  const editing = Boolean(orderId);
  const router = useRouter();
  const detail = usePurchaseOrder(orderId);
  const create = useCreatePurchaseOrder();
  const update = useUpdatePurchaseOrder();
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const options = usePurchaseOrderOptions(productSearch);
  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: emptyPurchaseOrder(),
  });
  const items = useFieldArray({ control: form.control, name: 'items' });
  useEffect(() => {
    if (!detail.data) return;
    form.reset({
      supplierId: detail.data.supplier.id,
      warehouseId: detail.data.warehouse.id,
      expectedDeliveryDate: detail.data.expectedDeliveryDate ?? '',
      notes: detail.data.notes ?? '',
      discountAmount: detail.data.discountAmount.replace('.', ','),
      freightAmount: detail.data.freightAmount.replace('.', ','),
      otherAmount: detail.data.otherAmount.replace('.', ','),
      items: detail.data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity.replace('.', ','),
        unitCost: item.unitCost.replace('.', ','),
      })),
    });
  }, [detail.data, form]);
  const watchedItems = useWatch({ control: form.control, name: 'items', defaultValue: [] });
  const discountAmount = useWatch({
    control: form.control,
    name: 'discountAmount',
    defaultValue: '0',
  });
  const freightAmount = useWatch({
    control: form.control,
    name: 'freightAmount',
    defaultValue: '0',
  });
  const otherAmount = useWatch({
    control: form.control,
    name: 'otherAmount',
    defaultValue: '0',
  });
  const subtotal = useMemo(
    () =>
      watchedItems.reduce(
        (sum, item) => sum + Number(canonical(item.quantity)) * Number(canonical(item.unitCost)),
        0,
      ),
    [watchedItems],
  );
  const total =
    subtotal -
    Number(canonical(discountAmount)) +
    Number(canonical(freightAmount)) +
    Number(canonical(otherAmount));
  const addProduct = () => {
    const product = options.data?.products.find((item) => item.id === selectedProduct);
    if (!product) return;
    if (watchedItems.some((item) => item.productId === product.id)) {
      toast.error('Este produto já está no pedido.');
      return;
    }
    items.append({
      productId: product.id,
      quantity: '1,0000',
      unitCost: product.suggestedUnitCost.replace('.', ','),
    });
    setSelectedProduct('');
  };
  const submit = async (raw: PurchaseOrderFormValues) => {
    try {
      const parsed = purchaseOrderSchema.parse(raw);
      const input: PurchaseOrderInput = {
        ...parsed,
        expectedDeliveryDate: parsed.expectedDeliveryDate || null,
        notes: parsed.notes || null,
      };
      const saved = orderId
        ? await update.mutateAsync({ id: orderId, input })
        : await create.mutateAsync(input);
      toast.success(editing ? 'Pedido atualizado.' : 'Pedido criado como rascunho.');
      router.push(`/purchases/orders/${saved.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o pedido.'));
    }
  };
  if (editing && detail.isLoading) return <Skeleton className="h-[600px]" />;
  if (editing && detail.isError)
    return (
      <ErrorState
        message="Não foi possível carregar o pedido."
        onRetry={() => void detail.refetch()}
      />
    );
  if (detail.data && detail.data.status !== 'DRAFT')
    return (
      <ErrorState
        message="Somente pedidos em rascunho podem ser editados."
        onRetry={() => router.push(`/purchases/orders/${detail.data.id}`)}
      />
    );
  const pending = create.isPending || update.isPending;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compras"
        title={editing ? `Editar ${detail.data?.number ?? 'pedido'}` : 'Novo pedido de compra'}
        description="O pedido será salvo como rascunho e não altera o estoque."
        action={
          <Link
            className={cn(buttonVariants({ variant: 'outline' }))}
            href={orderId ? `/purchases/orders/${orderId}` : '/purchases/orders'}
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        }
      />
      <form className="space-y-6" noValidate onSubmit={form.handleSubmit(submit)}>
        <Section title="Fornecedor e destino">
          <Field label="Fornecedor" error={form.formState.errors.supplierId?.message}>
            <Controller
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Fornecedor">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.data?.suppliers.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} — {item.document}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Depósito de destino" error={form.formState.errors.warehouseId?.message}>
            <Controller
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Depósito de destino">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.data?.warehouses.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
                    {product.name} — {product.sku} ({product.unitSymbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addProduct} type="button">
              <Plus className="size-4" /> Adicionar
            </Button>
          </div>
          <div className="col-span-full overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Produto</th>
                  <th className="p-2">Quantidade</th>
                  <th className="p-2">Custo unitário</th>
                  <th className="p-2">Subtotal</th>
                  <th>
                    <span className="sr-only">Remover</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.fields.map((field, index) => {
                  const product =
                    options.data?.products.find(
                      (item) => item.id === watchedItems[index]?.productId,
                    ) ?? detail.data?.items.find((item) => item.productId === field.productId);
                  const productName =
                    product && 'productName' in product ? product.productName : product?.name;
                  const productSku =
                    product && 'productSku' in product ? product.productSku : product?.sku;
                  const line =
                    Number(canonical(watchedItems[index]?.quantity ?? '0')) *
                    Number(canonical(watchedItems[index]?.unitCost ?? '0'));
                  return (
                    <tr className="border-b" key={field.id}>
                      <td className="p-2">
                        <span className="font-medium">{productName ?? 'Produto'}</span>
                        <br />
                        <span className="text-slate-500">{productSku}</span>
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
                          aria-label={`Custo do item ${index + 1}`}
                          inputMode="decimal"
                          {...form.register(`items.${index}.unitCost`)}
                        />
                      </td>
                      <td className="p-2">{formatCurrency(line.toFixed(2))}</td>
                      <td>
                        <Button
                          aria-label={`Remover item ${index + 1}`}
                          onClick={() => items.remove(index)}
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
        <Section title="Valores adicionais e resumo">
          <Field label="Desconto (R$)">
            <Input aria-label="Desconto" inputMode="decimal" {...form.register('discountAmount')} />
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
              Subtotal: <strong>{formatCurrency(subtotal.toFixed(2))}</strong>
            </p>
            <p className="mt-2 text-lg">
              Total: <strong>{formatCurrency(Math.max(0, total).toFixed(2))}</strong>
            </p>
          </div>
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
