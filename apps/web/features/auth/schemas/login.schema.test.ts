import { describe, expect, it } from 'vitest';
import { loginSchema } from './login.schema';

describe('loginSchema', () => {
  it('aceita credenciais compatíveis com a API', () => {
    expect(
      loginSchema.safeParse({
        email: 'admin@erp.local',
        password: 'senha-segura-com-12-caracteres',
      }).success,
    ).toBe(true);
  });

  it('rejeita e-mail inválido e senha curta', () => {
    const result = loginSchema.safeParse({ email: 'invalido', password: 'curta' });
    expect(result.success).toBe(false);
  });
});
