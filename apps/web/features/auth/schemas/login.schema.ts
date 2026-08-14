import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').email('Informe um e-mail válido.').max(254),
  password: z
    .string()
    .min(1, 'Informe a senha.')
    .min(12, 'A senha deve ter ao menos 12 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
