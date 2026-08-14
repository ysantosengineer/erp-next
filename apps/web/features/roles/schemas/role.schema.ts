import { z } from 'zod';

export const roleSchema = z.object({
  name: z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(80),
  description: z.string().trim().max(255, 'Use no máximo 255 caracteres.').optional(),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
