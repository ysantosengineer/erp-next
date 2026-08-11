import { describe, expect, it } from 'vitest';
import { roleSchema } from './role.schema';

describe('roleSchema', () => {
  it('aceita nome e descrição válidos', () => {
    expect(
      roleSchema.safeParse({ name: 'Financeiro', description: 'Acesso financeiro.' }).success,
    ).toBe(true);
  });

  it('rejeita nome curto e descrição acima do limite', () => {
    expect(roleSchema.safeParse({ name: 'F', description: 'x'.repeat(256) }).success).toBe(false);
  });
});
