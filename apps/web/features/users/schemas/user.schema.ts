import { z } from 'zod';

const name = z.string().trim().min(2, 'Informe ao menos 2 caracteres.').max(120);
const email = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail.')
  .email('Informe um e-mail válido.')
  .max(254);

export const createUserSchema = z.object({
  name,
  email,
  password: z.string().min(12, 'A senha deve ter ao menos 12 caracteres.').max(128),
  roleIds: z.array(z.uuid()),
});

export const updateUserSchema = z.object({ name, email });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
