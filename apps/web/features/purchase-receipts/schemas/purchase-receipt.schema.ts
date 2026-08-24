import { z } from 'zod';
import { normalizeDecimal } from '../../../lib/decimal';

const quantity = z
  .string()
  .transform(normalizeDecimal)
  .refine((value) => /^\d+(?:\.\d{1,4})?$/.test(value), 'Quantidade inválida.');

export const purchaseReceiptSchema = z.object({
  notes: z.string().max(4000, 'Use no máximo 4000 caracteres.'),
  items: z
    .array(
      z.object({
        purchaseOrderItemId: z.string().uuid(),
        locationId: z.string(),
        receivedQuantity: quantity,
        discrepancyReason: z.string().max(500, 'Use no máximo 500 caracteres.'),
      }),
    )
    .refine(
      (items) => items.some((item) => Number(normalizeDecimal(item.receivedQuantity)) > 0),
      'Informe uma quantidade para ao menos um item.',
    )
    .superRefine((items, context) => {
      items.forEach((item, index) => {
        if (Number(normalizeDecimal(item.receivedQuantity)) > 0 && !item.locationId) {
          context.addIssue({
            code: 'custom',
            message: 'Selecione o local de destino.',
            path: [index, 'locationId'],
          });
        }
      });
    }),
});

export type PurchaseReceiptFormValues = z.input<typeof purchaseReceiptSchema>;
