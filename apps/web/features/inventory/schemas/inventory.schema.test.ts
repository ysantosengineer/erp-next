import { describe, expect, it } from 'vitest';
import { movementFormSchema } from './inventory.schema';

const valid = { productId: '550e8400-e29b-41d4-a716-446655440000', quantity: '1.2500' };

describe('movementFormSchema', () => {
  it('aceita quantidade decimal positiva sem converter para number', () => {
    const result = movementFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.quantity).toBe('1.2500');
  });

  it('aceita fração positiva com zeros finais', () => {
    expect(movementFormSchema.safeParse({ ...valid, quantity: '0.0100' }).success).toBe(true);
  });

  it.each(['0', '-1', '1.00001', 'texto'])('rejeita quantidade inválida %s', (quantity) => {
    expect(movementFormSchema.safeParse({ ...valid, quantity }).success).toBe(false);
  });

  it('rejeita produto sem UUID válido', () => {
    expect(movementFormSchema.safeParse({ ...valid, productId: 'outro-tenant' }).success).toBe(
      false,
    );
  });
});
