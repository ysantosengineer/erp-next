import { describe, expect, it } from 'vitest';
import { salesOrderSchema } from './sales-order.schema';

const valid = {
  customerId: '10000000-0000-4000-8000-000000000001',
  warehouseId: '20000000-0000-4000-8000-000000000001',
  orderDate: '2026-08-23',
  expectedDeliveryDate: '',
  notes: '',
  discountAmount: '1,00',
  freightAmount: '2,50',
  otherAmount: '0',
  items: [
    {
      productId: '30000000-0000-4000-8000-000000000001',
      quantity: '2,5000',
      unitPrice: '10,25',
      discountAmount: '0,50',
    },
  ],
};

describe('salesOrderSchema', () => {
  it('normaliza quantidade, preço e descontos brasileiros', () => {
    expect(salesOrderSchema.parse(valid)).toMatchObject({
      discountAmount: '1.00',
      items: [{ quantity: '2.5000', unitPrice: '10.25', discountAmount: '0.50' }],
    });
  });

  it('rejeita vazio, duplicidade, quantidade zero e preço negativo', () => {
    expect(salesOrderSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(
      salesOrderSchema.safeParse({ ...valid, items: [valid.items[0], valid.items[0]] }).success,
    ).toBe(false);
    expect(
      salesOrderSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantity: '0' }] })
        .success,
    ).toBe(false);
    expect(
      salesOrderSchema.safeParse({ ...valid, items: [{ ...valid.items[0], unitPrice: '-1' }] })
        .success,
    ).toBe(false);
  });

  it('rejeita desconto do item acima do bruto e desconto geral acima do subtotal', () => {
    expect(
      salesOrderSchema.safeParse({
        ...valid,
        items: [{ ...valid.items[0], discountAmount: '1000' }],
      }).success,
    ).toBe(false);
    expect(salesOrderSchema.safeParse({ ...valid, discountAmount: '1000' }).success).toBe(false);
  });
});
