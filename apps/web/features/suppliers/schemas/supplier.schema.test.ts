import { describe, expect, it } from 'vitest';
import {
  emptySupplierForm,
  formatDocument,
  isValidCnpj,
  isValidCpf,
  supplierSchema,
  toSupplierInput,
} from './supplier.schema';
describe('supplier schema', () => {
  it('valida documentos', () => {
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCnpj('04252011000110')).toBe(true);
    expect(
      supplierSchema.safeParse({
        ...emptySupplierForm('INDIVIDUAL'),
        name: 'Maria',
        document: '04252011000110',
      }).success,
    ).toBe(false);
  });
  it('normaliza payload', () => {
    expect(
      toSupplierInput({
        ...emptySupplierForm('COMPANY'),
        name: 'Empresa',
        document: '04.252.011/0001-10',
      }),
    ).toMatchObject({ document: '04252011000110' });
    expect(formatDocument('52998224725')).toBe('529.982.247-25');
  });
});
