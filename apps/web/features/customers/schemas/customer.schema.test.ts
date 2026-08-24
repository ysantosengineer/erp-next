import { describe, expect, it } from 'vitest';
import { formatCurrency, normalizeDecimal } from '../../../lib/decimal';
import {
  customerSchema,
  customerToForm,
  emptyCustomerForm,
  toCustomerInput,
} from './customer.schema';

describe('customer schema', () => {
  it.each([
    ['INDIVIDUAL', '52998224725'],
    ['COMPANY', '04252011000110'],
  ] as const)('aceita documento válido para %s', (type, document) => {
    expect(
      customerSchema.safeParse({ ...emptyCustomerForm(type), name: 'Cliente válido', document })
        .success,
    ).toBe(true);
  });

  it.each([
    ['INDIVIDUAL', '52998224724'],
    ['INDIVIDUAL', '11111111111'],
    ['COMPANY', '04252011000111'],
    ['COMPANY', '11111111111111'],
    ['INDIVIDUAL', '04252011000110'],
    ['COMPANY', '52998224725'],
  ] as const)('rejeita documento inválido ou incompatível para %s', (type, document) => {
    expect(
      customerSchema.safeParse({ ...emptyCustomerForm(type), name: 'Cliente inválido', document })
        .success,
    ).toBe(false);
  });

  it.each([
    ['0', '0'],
    ['0,00', '0.00'],
    ['1.234,56', '1234.56'],
    ['999999999999,99', '999999999999.99'],
    ['10.50', '10.50'],
  ])('normaliza limite monetário %s sem usar float', (input, expected) => {
    expect(normalizeDecimal(input)).toBe(expected);
    expect(
      customerSchema.safeParse({
        ...emptyCustomerForm(),
        name: 'Maria',
        document: '52998224725',
        creditLimit: input,
      }).success,
    ).toBe(true);
  });

  it.each(['-1,00', '1,001', 'abc', '1.000.000.000.000,00'])(
    'rejeita limite inválido %s',
    (value) => {
      expect(
        customerSchema.safeParse({
          ...emptyCustomerForm(),
          name: 'Maria',
          document: '52998224725',
          creditLimit: value,
        }).success,
      ).toBe(false);
    },
  );

  it('normaliza documento, telefone, email e endereço no payload', () => {
    const input = toCustomerInput({
      ...emptyCustomerForm('COMPANY'),
      name: '  Empresa Cliente  ',
      document: '04.252.011/0001-10',
      email: ' FINANCEIRO@EXAMPLE.COM ',
      phone: '(41) 99999-9999',
      creditLimit: '1.500,50',
      address: {
        postalCode: '80010-000',
        street: ' Rua das Flores ',
        number: '10',
        complement: '',
        district: 'Centro',
        city: 'Curitiba',
        state: 'pr',
        country: 'br',
      },
    });
    expect(input).toEqual(
      expect.objectContaining({
        name: 'Empresa Cliente',
        document: '04252011000110',
        email: 'financeiro@example.com',
        phone: '41999999999',
        creditLimit: '1500.50',
        address: expect.objectContaining({ postalCode: '80010000', state: 'PR', country: 'BR' }),
      }),
    );
  });

  it('omite endereço vazio na criação', () => {
    const input = toCustomerInput({
      ...emptyCustomerForm(),
      name: 'Maria',
      document: '52998224725',
    });
    expect(input).not.toHaveProperty('address');
  });

  it('envia null para limpar endereço na edição', () => {
    const input = toCustomerInput(
      { ...emptyCustomerForm(), name: 'Maria', document: '52998224725' },
      true,
    );
    expect(input.address).toBeNull();
  });

  it('converte resposta monetária precisa para o formulário', () => {
    const values = customerToForm({
      id: '1',
      type: 'INDIVIDUAL',
      name: 'Maria',
      tradeName: null,
      document: '52998224725',
      email: null,
      phone: null,
      creditLimit: '123456789012.34',
      notes: null,
      isActive: true,
      address: null,
      createdAt: '',
      updatedAt: '',
    });
    expect(values.creditLimit).toBe('123.456.789.012,34');
    expect(toCustomerInput(values).creditLimit).toBe('123456789012.34');
  });

  it('formata moeda a partir da string decimal', () => {
    expect(formatCurrency('1500.50')).toBe('R$ 1.500,50');
  });

  it('valida CEP e UF quando informados', () => {
    const result = customerSchema.safeParse({
      ...emptyCustomerForm(),
      name: 'Maria',
      document: '52998224725',
      address: { ...emptyCustomerForm().address, postalCode: '123', state: 'P' },
    });
    expect(result.success).toBe(false);
  });
});
