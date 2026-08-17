import { describe, expect, it } from 'vitest';
import { toWarehouseInput, warehouseSchema, warehouseToForm } from './warehouse.schema';

describe('warehouse schema', () => {
  it('exige nome e código', () => {
    expect(warehouseSchema.safeParse({ name: '', code: '', description: '' }).success).toBe(false);
  });

  it('normaliza código e texto', () => {
    expect(
      toWarehouseInput({ name: ' Principal ', code: ' main ', description: ' Geral ' }),
    ).toEqual({ name: 'Principal', code: 'MAIN', description: 'Geral' });
  });

  it('rejeita espaço no código', () => {
    expect(
      warehouseSchema.safeParse({ name: 'Principal', code: 'COD INVALIDO', description: '' })
        .success,
    ).toBe(false);
  });

  it('envia null para limpar descrição na edição', () => {
    expect(
      toWarehouseInput({ name: 'Principal', code: 'MAIN', description: '' }, true).description,
    ).toBeNull();
  });

  it('converte resposta para formulário', () => {
    expect(
      warehouseToForm({ name: 'Principal', code: 'MAIN', description: null } as never),
    ).toEqual({ name: 'Principal', code: 'MAIN', description: '' });
  });
});
