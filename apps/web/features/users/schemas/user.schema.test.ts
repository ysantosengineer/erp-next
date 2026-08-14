import { describe, expect, it } from 'vitest';
import { createUserSchema, updateUserSchema } from './user.schema';

describe('user schemas', () => {
  it('aceita cadastro compatível com a API', () => {
    expect(
      createUserSchema.safeParse({
        name: 'Maria Silva',
        email: 'maria@erp.local',
        password: 'senha-inicial-segura',
        roleIds: [],
      }).success,
    ).toBe(true);
  });

  it('rejeita senha curta, nome inválido e e-mail inválido', () => {
    expect(
      createUserSchema.safeParse({ name: 'M', email: 'inválido', password: 'curta', roleIds: [] })
        .success,
    ).toBe(false);
  });

  it('limita a edição a nome e e-mail válidos', () => {
    expect(
      updateUserSchema.safeParse({ name: 'Maria Silva', email: 'maria@erp.local' }).success,
    ).toBe(true);
  });
});
