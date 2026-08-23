import { describe, expect, it } from 'vitest';
import { purchaseReceiptSchema } from './purchase-receipt.schema';

const item = {
  purchaseOrderItemId: '10000000-0000-4000-8000-000000000001',
  locationId: '20000000-0000-4000-8000-000000000001',
  receivedQuantity: '5,2500',
  discrepancyReason: '',
};

describe('purchaseReceiptSchema', () => {
  it('normaliza quantidade brasileira', () => {
    const parsed = purchaseReceiptSchema.parse({ notes: '', items: [item] });
    expect(parsed.items[0].receivedQuantity).toBe('5.2500');
  });

  it('permite omitir item usando quantidade zero', () => {
    const parsed = purchaseReceiptSchema.safeParse({
      notes: '',
      items: [{ ...item, receivedQuantity: '0', locationId: '' }, item],
    });
    expect(parsed.success).toBe(true);
  });

  it('exige ao menos uma quantidade positiva', () => {
    expect(
      purchaseReceiptSchema.safeParse({
        notes: '',
        items: [{ ...item, receivedQuantity: '0', locationId: '' }],
      }).success,
    ).toBe(false);
  });

  it('exige localização somente para linha recebida', () => {
    expect(
      purchaseReceiptSchema.safeParse({ notes: '', items: [{ ...item, locationId: '' }] }).success,
    ).toBe(false);
  });
});
