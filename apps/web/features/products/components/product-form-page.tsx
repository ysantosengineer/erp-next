'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
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
import { ApiError } from '../../../lib/api/api-error';
import { getApiErrorMessage } from '../../../lib/api/api-error-message';
import { cn } from '../../../lib/utils';
import {
  useCreateProduct,
  useProduct,
  useProductOptions,
  useUpdateProduct,
} from '../hooks/use-products';
import {
  emptyProductForm,
  productSchema,
  productToForm,
  toProductInput,
  type ProductFormValues,
} from '../schemas/product.schema';

export function ProductFormPage({ productId }: Readonly<{ productId?: string }>) {
  const editing = Boolean(productId);
  const router = useRouter();
  const product = useProduct(productId);
  const options = useProductOptions();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProductForm(),
    values: product.data ? productToForm(product.data) : undefined,
    resetOptions: { keepDirtyValues: true },
  });

  useEffect(() => {
    if (!product.data) return;
    setValue('categoryId', product.data.category.id);
    setValue('unitId', product.data.unit.id);
    setValue('primarySupplierId', product.data.primarySupplier?.id ?? 'none');
  }, [product.data, setValue]);

  const categoryOptions = useMemo(() => {
    const active = options.categories.data?.data ?? [];
    if (!product.data || active.some((item) => item.id === product.data.category.id)) return active;
    return [...active, product.data.category];
  }, [options.categories.data, product.data]);
  const unitOptions = useMemo(() => {
    const active = options.units.data?.data ?? [];
    if (!product.data || active.some((item) => item.id === product.data.unit.id)) return active;
    return [...active, product.data.unit];
  }, [options.units.data, product.data]);
  const supplierOptions = useMemo(() => {
    const active = options.suppliers.data?.data ?? [];
    const current = product.data?.primarySupplier;
    if (!current || active.some((item) => item.id === current.id)) return active;
    return [...active, current];
  }, [options.suppliers.data, product.data]);

  const submit = async (values: ProductFormValues) => {
    try {
      const input = toProductInput({
        ...values,
        categoryId: values.categoryId || product.data?.category.id || '',
        unitId: values.unitId || product.data?.unit.id || '',
        primarySupplierId: values.primarySupplierId || product.data?.primarySupplier?.id || 'none',
      });
      if (productId) await update.mutateAsync({ id: productId, input });
      else await create.mutateAsync(input);
      toast.success(editing ? 'Produto atualizado com sucesso.' : 'Produto criado com sucesso.');
      router.push('/products');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PRODUCT_SKU_EXISTS') {
        setError('sku', { message: 'Este SKU já está cadastrado na empresa.' });
        return;
      }
      if (error instanceof ApiError && error.code === 'PRODUCT_BARCODE_EXISTS') {
        setError('barcode', { message: 'Este código de barras já está cadastrado na empresa.' });
        return;
      }
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o produto.'));
    }
  };

  if (editing && product.isLoading) {
    return <Skeleton className="h-[560px] w-full" data-testid="product-form-loading" />;
  }
  if (editing && product.isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(product.error, 'Não foi possível carregar o produto.')}
        onRetry={() => void product.refetch()}
      />
    );
  }

  const optionsFailed =
    options.categories.isError || options.units.isError || options.suppliers.isError;
  const pending = create.isPending || update.isPending;
  const fieldError = (message?: string) =>
    message ? <p className="text-sm text-red-700">{message}</p> : null;

  return (
    <div className="space-y-7">
      <PageHeader
        action={
          <Link className={cn(buttonVariants({ variant: 'outline' }))} href="/products">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        }
        description={
          editing
            ? 'Atualize os dados comerciais e logísticos do item.'
            : 'Inclua um novo item no catálogo da empresa.'
        }
        eyebrow="Produtos"
        title={editing ? 'Editar produto' : 'Novo produto'}
      />
      {optionsFailed ? (
        <ErrorState
          message="Não foi possível carregar categorias, unidades ou fornecedores disponíveis."
          onRetry={() => {
            void options.categories.refetch();
            void options.units.refetch();
            void options.suppliers.refetch();
          }}
        />
      ) : (
        <form className="space-y-6" noValidate onSubmit={handleSubmit(submit)}>
          <FormSection title="Dados gerais" description="Identificação e classificação do produto.">
            <Field className="md:col-span-2" label="Nome" error={errors.name?.message}>
              <Input aria-label="Nome" autoFocus {...register('name')} />
            </Field>
            <Field label="SKU" error={errors.sku?.message}>
              <Input
                aria-label="SKU"
                className="font-mono uppercase"
                placeholder="PROD-001"
                {...register('sku')}
              />
            </Field>
            <Field label="Código de barras" error={errors.barcode?.message}>
              <Input
                aria-label="Código de barras"
                inputMode="numeric"
                maxLength={14}
                {...register('barcode')}
              />
            </Field>
            <Field label="Categoria" error={errors.categoryId?.message}>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    disabled={options.categories.isLoading}
                    value={field.value || product.data?.category.id || ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger aria-label="Categoria">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                          {item.isActive ? '' : ' (inativa)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Unidade de medida" error={errors.unitId?.message}>
              <Controller
                control={control}
                name="unitId"
                render={({ field }) => (
                  <Select
                    disabled={options.units.isLoading}
                    value={field.value || product.data?.unit.id || ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger aria-label="Unidade de medida">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                          {item.symbol ? ` (${item.symbol})` : ''}
                          {item.isActive ? '' : ' — inativa'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field className="md:col-span-2" label="Descrição" error={errors.description?.message}>
              <Textarea aria-label="Descrição" rows={4} {...register('description')} />
            </Field>
          </FormSection>

          <FormSection
            title="Dados comerciais"
            description="Valores são enviados como decimais exatos, sem ponto flutuante."
          >
            <Field label="Preço de custo (R$)" error={errors.costPrice?.message}>
              <Input
                aria-label="Preço de custo"
                inputMode="decimal"
                placeholder="0,00"
                {...register('costPrice')}
              />
            </Field>
            <Field label="Preço de venda (R$)" error={errors.salePrice?.message}>
              <Input
                aria-label="Preço de venda"
                inputMode="decimal"
                placeholder="0,00"
                {...register('salePrice')}
              />
            </Field>
            <Field
              className="md:col-span-2"
              label="Fornecedor principal"
              error={errors.primarySupplierId?.message}
            >
              <Controller
                control={control}
                name="primarySupplierId"
                render={({ field }) => (
                  <Select
                    disabled={options.suppliers.isLoading}
                    value={field.value || product.data?.primarySupplier?.id || 'none'}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger aria-label="Fornecedor principal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum fornecedor principal</SelectItem>
                      {supplierOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                          {item.isActive ? '' : ' (inativo)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </FormSection>

          <FormSection
            title="Dados logísticos"
            description="Peso em quilogramas e dimensões em centímetros."
          >
            <Field label="Peso (kg)" error={errors.weight?.message}>
              <Input
                aria-label="Peso"
                inputMode="decimal"
                placeholder="0,000"
                {...register('weight')}
              />
            </Field>
            <Field label="Estoque mínimo" error={errors.minimumStock?.message}>
              <Input
                aria-label="Estoque mínimo"
                inputMode="decimal"
                placeholder="0,000"
                {...register('minimumStock')}
              />
            </Field>
            <Field label="Altura (cm)" error={errors.height?.message}>
              <Input aria-label="Altura" inputMode="decimal" {...register('height')} />
            </Field>
            <Field label="Largura (cm)" error={errors.width?.message}>
              <Input aria-label="Largura" inputMode="decimal" {...register('width')} />
            </Field>
            <Field label="Comprimento (cm)" error={errors.length?.message}>
              <Input aria-label="Comprimento" inputMode="decimal" {...register('length')} />
            </Field>
          </FormSection>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button asChild type="button" variant="outline">
              <Link href="/products">Cancelar</Link>
            </Button>
            <Button
              disabled={pending || options.categories.isLoading || options.units.isLoading}
              type="submit"
            >
              <Save className="size-4" /> {pending ? 'Salvando…' : 'Salvar produto'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: Readonly<{ title: string; description: string; children: React.ReactNode }>) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: Readonly<{ label: string; error?: string; className?: string; children: React.ReactNode }>) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
