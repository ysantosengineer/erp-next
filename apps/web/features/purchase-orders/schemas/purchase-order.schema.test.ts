import { describe, expect, it } from 'vitest';
import { purchaseOrderSchema } from './purchase-order.schema';
const valid = {
  supplierId: '10000000-0000-4000-8000-000000000001',
  warehouseId: '20000000-0000-4000-8000-000000000001',
  expectedDeliveryDate: '',
  notes: '',
  discountAmount: '1,00',
  freightAmount: '2,50',
  otherAmount: '0',
  items: [
    { productId: '30000000-0000-4000-8000-000000000001', quantity: '2,5000', unitCost: '10,25' },
  ],
};
describe('purchaseOrderSchema', () => {
  it('normaliza decimais brasileiros', () => {
    expect(purchaseOrderSchema.parse(valid)).toMatchObject({
      discountAmount: '1.00',
      items: [{ quantity: '2.5000', unitCost: '10.25' }],
    });
  });
  it('rejeita vazio, duplicidade, quantidade zero e custo negativo', () => {
    expect(purchaseOrderSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(
      purchaseOrderSchema.safeParse({ ...valid, items: [valid.items[0], valid.items[0]] }).success,
    ).toBe(false);
    expect(
      purchaseOrderSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantity: '0' }] })
        .success,
    ).toBe(false);
    expect(
      purchaseOrderSchema.safeParse({ ...valid, items: [{ ...valid.items[0], unitCost: '-1' }] })
        .success,
    ).toBe(false);
  });
});
