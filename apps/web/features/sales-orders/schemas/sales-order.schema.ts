import { z } from 'zod';
import { normalizeDecimal } from '../../../lib/decimal';

const decimal = (label: string, positive = false, scale = 2) =>
  z
    .string()
    .transform(normalizeDecimal)
    .refine(
      (value) =>
        new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`).test(value) &&
        Number(value) >= (positive ? Number.EPSILON : 0),
      `${label} inválido.`,
    );

export const salesOrderSchema = z
  .object({
    customerId: z.string().uuid('Selecione um cliente.'),
    warehouseId: z.string().uuid('Selecione um depósito.'),
    orderDate: z.string().min(1, 'Informe a data do pedido.'),
    expectedDeliveryDate: z.string(),
    notes: z.string().max(4000),
    discountAmount: decimal('Desconto geral'),
    freightAmount: decimal('Frete'),
    otherAmount: decimal('Outros valores'),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: decimal('Quantidade', true, 4),
          unitPrice: decimal('Preço unitário'),
          discountAmount: decimal('Desconto do item'),
        }),
      )
      .min(1, 'Adicione ao menos um produto.')
      .refine(
        (items) => new Set(items.map((item) => item.productId)).size === items.length,
        'Não repita produtos.',
      ),
  })
  .superRefine((values, context) => {
    let subtotal = 0;
    values.items.forEach((item, index) => {
      const gross = Number(item.quantity) * Number(item.unitPrice);
      const discount = Number(item.discountAmount);
      if (discount > gross) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'discountAmount'],
          message: 'O desconto não pode superar o valor bruto do item.',
        });
      }
      subtotal += Math.max(0, gross - discount);
    });
    if (Number(values.discountAmount) > subtotal) {
      context.addIssue({
        code: 'custom',
        path: ['discountAmount'],
        message: 'O desconto geral não pode superar o subtotal.',
      });
    }
  });

export type SalesOrderFormValues = z.input<typeof salesOrderSchema>;

const today = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const emptySalesOrder = (): SalesOrderFormValues => ({
  customerId: '',
  warehouseId: '',
  orderDate: today(),
  expectedDeliveryDate: '',
  notes: '',
  discountAmount: '0,00',
  freightAmount: '0,00',
  otherAmount: '0,00',
  items: [],
});
