import { z } from 'zod';
import { normalizeDecimal } from '../../../lib/decimal';

const decimal = (label: string, positive = false) =>
  z
    .string()
    .transform(normalizeDecimal)
    .refine(
      (value) =>
        /^\d+(?:\.\d{1,4})?$/.test(value) && Number(value) >= (positive ? Number.EPSILON : 0),
      `${label} inválido.`,
    );
export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Selecione um fornecedor.'),
  warehouseId: z.string().uuid('Selecione um depósito.'),
  expectedDeliveryDate: z.string(),
  notes: z.string().max(4000),
  discountAmount: decimal('Desconto'),
  freightAmount: decimal('Frete'),
  otherAmount: decimal('Outros valores'),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: decimal('Quantidade', true),
        unitCost: decimal('Custo'),
      }),
    )
    .min(1, 'Adicione ao menos um produto.')
    .refine(
      (items) => new Set(items.map((item) => item.productId)).size === items.length,
      'Não repita produtos.',
    ),
});
export type PurchaseOrderFormValues = z.input<typeof purchaseOrderSchema>;
export const emptyPurchaseOrder = (): PurchaseOrderFormValues => ({
  supplierId: '',
  warehouseId: '',
  expectedDeliveryDate: '',
  notes: '',
  discountAmount: '0,00',
  freightAmount: '0,00',
  otherAmount: '0,00',
  items: [],
});
