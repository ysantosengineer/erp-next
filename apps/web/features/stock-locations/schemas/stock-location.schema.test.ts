import { describe, expect, it } from 'vitest';
import {
  stockLocationSchema,
  stockLocationToForm,
  toStockLocationInput,
} from './stock-location.schema';

const valid = {
  code: 'A-01',
  description: '',
  zone: '',
  aisle: '',
  rack: '',
  level: '',
  position: '',
  capacity: '',
};

describe('stock location schema', () => {
  it('exige código', () =>
    expect(stockLocationSchema.safeParse({ ...valid, code: '' }).success).toBe(false));

  it.each(['-1', '1,0000', '123456789012,000', 'texto'])(
    'rejeita capacidade inválida %s',
    (capacity) => {
      expect(stockLocationSchema.safeParse({ ...valid, capacity }).success).toBe(false);
    },
  );

  it('aceita zero e três casas decimais', () => {
    expect(stockLocationSchema.safeParse({ ...valid, capacity: '100,125' }).success).toBe(true);
  });

  it('normaliza código, estrutura e decimal sem float', () => {
    expect(
      toStockLocationInput({
        ...valid,
        code: ' a-01 ',
        zone: ' recebimento ',
        capacity: '1.000,125',
      }),
    ).toEqual({ code: 'A-01', zone: 'RECEBIMENTO', capacity: '1000.125' });
  });

  it('envia null para limpar opcionais na edição', () => {
    const result = toStockLocationInput(valid, true);
    expect(result).toEqual(
      expect.objectContaining({ description: null, zone: null, capacity: null }),
    );
  });

  it('formata capacidade da resposta para edição', () => {
    expect(stockLocationToForm({ code: 'A', capacity: '1500.500' } as never).capacity).toBe(
      '1.500,500',
    );
  });
});
