import { describe, expect, it } from 'vitest';
import {
  countQuantitySchema,
  createInventoryCountSchema,
  toCanonicalQuantity,
} from './inventory-count.schema';

describe('inventory count schemas', () => {
  it('aceita zero, vírgula e até quatro casas', () => {
    expect(countQuantitySchema.safeParse({ quantity: '0' }).success).toBe(true);
    expect(countQuantitySchema.safeParse({ quantity: '10,1234' }).success).toBe(true);
    expect(toCanonicalQuantity('10,1234')).toBe('10.1234');
  });

  it('rejeita quantidade negativa e depósito inválido', () => {
    expect(countQuantitySchema.safeParse({ quantity: '-1' }).success).toBe(false);
    expect(countQuantitySchema.safeParse({ quantity: '1.12345' }).success).toBe(false);
    expect(createInventoryCountSchema.safeParse({ warehouseId: 'invalid' }).success).toBe(false);
  });
});
