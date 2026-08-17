import { z } from 'zod';
import { formatDecimalPtBr, normalizeDecimal } from '../../../lib/decimal';
import type { Product, ProductInput } from '../types/product.types';

const monetary = /^(?:(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)$/;
const quantity = /^(?:(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,3})?|\d+(?:\.\d{1,3})?)$/;
const optionalDecimal = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || pattern.test(value), message);

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Informe um nome com ao menos 2 caracteres.').max(160),
  description: z.string().trim().max(4000, 'Use no máximo 4.000 caracteres.'),
  sku: z
    .string()
    .trim()
    .min(1, 'Informe o SKU.')
    .max(80)
    .refine((value) => /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value), {
      message: 'Use apenas letras, números e os separadores - _ . /.',
    }),
  barcode: z
    .string()
    .trim()
    .refine((value) => !value || /^\d{8,14}$/.test(value), {
      message: 'Use de 8 a 14 dígitos.',
    }),
  categoryId: z.string().min(1, 'Selecione a categoria.'),
  unitId: z.string().min(1, 'Selecione a unidade de medida.'),
  primarySupplierId: z.string(),
  costPrice: z.string().trim().regex(monetary, 'Informe um valor monetário válido.'),
  salePrice: z.string().trim().regex(monetary, 'Informe um valor monetário válido.'),
  weight: optionalDecimal(quantity, 'Informe um peso válido.'),
  height: optionalDecimal(quantity, 'Informe uma altura válida.'),
  width: optionalDecimal(quantity, 'Informe uma largura válida.'),
  length: optionalDecimal(quantity, 'Informe um comprimento válido.'),
  minimumStock: z.string().trim().regex(quantity, 'Informe um estoque mínimo válido.'),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const emptyProductForm = (): ProductFormValues => ({
  name: '',
  description: '',
  sku: '',
  barcode: '',
  categoryId: '',
  unitId: '',
  primarySupplierId: 'none',
  costPrice: '0,00',
  salePrice: '0,00',
  weight: '',
  height: '',
  width: '',
  length: '',
  minimumStock: '0,000',
});

export { formatCurrency, formatDecimalPtBr, normalizeDecimal } from '../../../lib/decimal';

const optional = (value: string) => (value.trim() ? normalizeDecimal(value) : null);

export function toProductInput(values: ProductFormValues): ProductInput {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    sku: values.sku.trim().toUpperCase(),
    barcode: values.barcode.trim() || null,
    categoryId: values.categoryId,
    unitId: values.unitId,
    primarySupplierId: values.primarySupplierId === 'none' ? null : values.primarySupplierId,
    costPrice: normalizeDecimal(values.costPrice),
    salePrice: normalizeDecimal(values.salePrice),
    weight: optional(values.weight),
    height: optional(values.height),
    width: optional(values.width),
    length: optional(values.length),
    minimumStock: normalizeDecimal(values.minimumStock),
  };
}

export function productToForm(product: Product): ProductFormValues {
  return {
    name: product.name,
    description: product.description ?? '',
    sku: product.sku,
    barcode: product.barcode ?? '',
    categoryId: product.category.id,
    unitId: product.unit.id,
    primarySupplierId: product.primarySupplier?.id ?? 'none',
    costPrice: formatDecimalPtBr(product.costPrice, 2),
    salePrice: formatDecimalPtBr(product.salePrice, 2),
    weight: product.weight ? formatDecimalPtBr(product.weight, 3) : '',
    height: product.height ? formatDecimalPtBr(product.height, 3) : '',
    width: product.width ? formatDecimalPtBr(product.width, 3) : '',
    length: product.length ? formatDecimalPtBr(product.length, 3) : '',
    minimumStock: formatDecimalPtBr(product.minimumStock, 3),
  };
}
