import { z } from 'zod';

export const createInventoryCountSchema = z.object({
  warehouseId: z.string().uuid('Selecione um depósito.'),
  description: z.string().trim().max(1000, 'Use no máximo 1000 caracteres.').optional(),
});

export const countQuantitySchema = z.object({
  quantity: z
    .string()
    .trim()
    .regex(/^\d+(?:[.,]\d{1,4})?$/, 'Informe uma quantidade não negativa com até 4 casas.'),
});

export type CreateInventoryCountFormValues = z.infer<typeof createInventoryCountSchema>;
export type CountQuantityFormValues = z.infer<typeof countQuantitySchema>;

export const toCanonicalQuantity = (quantity: string) => quantity.trim().replace(',', '.');
