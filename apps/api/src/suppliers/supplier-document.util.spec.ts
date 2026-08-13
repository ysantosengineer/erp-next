import { SupplierType } from '@prisma/client';
import {
  digitsOnly,
  isValidCnpj,
  isValidCpf,
  isValidSupplierDocument,
} from './supplier-document.util';
describe('supplier documents', () => {
  it('normaliza e valida CPF', () => {
    expect(digitsOnly('529.982.247-25')).toBe('52998224725');
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('11111111111')).toBe(false);
  });
  it('valida CNPJ e coerência de tipo', () => {
    expect(isValidCnpj('04.252.011/0001-10')).toBe(true);
    expect(isValidCnpj('04.252.011/0001-11')).toBe(false);
    expect(isValidSupplierDocument(SupplierType.INDIVIDUAL, '04252011000110')).toBe(false);
  });
});
