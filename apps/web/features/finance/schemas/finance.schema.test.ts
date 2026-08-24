import { describe, expect, it } from 'vitest';
import { financialEntrySchema, settlementSchema } from './finance.schema';

describe('finance schemas', () => {
  it('normaliza moeda brasileira e valida datas', () => {
    expect(
      financialEntrySchema.parse({
        description: 'Título',
        documentNumber: '',
        partyId: '',
        issueDate: '2026-08-01',
        dueDate: '2026-08-02',
        originalAmount: '1.234,56',
        notes: '',
      }).originalAmount,
    ).toBe('1234.56');
    expect(() =>
      financialEntrySchema.parse({
        description: 'Título',
        documentNumber: '',
        partyId: '',
        issueDate: '2026-08-03',
        dueDate: '2026-08-02',
        originalAmount: '1',
        notes: '',
      }),
    ).toThrow();
  });
  it('rejeita liquidação zero', () =>
    expect(() =>
      settlementSchema.parse({
        amount: '0',
        settledAt: '2026-08-01',
        paymentMethod: 'PIX',
        notes: '',
      }),
    ).toThrow());
});
