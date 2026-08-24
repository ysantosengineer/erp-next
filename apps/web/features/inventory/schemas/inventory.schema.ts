import { z } from 'zod';

const quantity = z
  .string()
  .regex(
    /^(?=.{1,19}$)(?=.*[1-9])(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/,
    'Informe uma quantidade positiva com até 4 casas.',
  );
export const movementFormSchema = z.object({
  productId: z.string().uuid('Selecione um produto.'),
  quantity,
  sourceLocationId: z.string().optional(),
  destinationLocationId: z.string().optional(),
  direction: z.enum(['IN', 'OUT']).optional(),
  reason: z.string().max(1000).optional(),
  idempotencyKey: z.string().max(100).optional(),
});
export type MovementFormValues = z.infer<typeof movementFormSchema>;
