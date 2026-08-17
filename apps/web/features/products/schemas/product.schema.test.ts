import { describe, expect, it } from 'vitest';
import {
  emptyProductForm,
  formatCurrency,
  formatDecimalPtBr,
  normalizeDecimal,
  productSchema,
  productToForm,
  toProductInput,
} from './product.schema';

const valid = () => ({
  ...emptyProductForm(),
  name: 'Café especial',
  sku: 'cafe-001',
  barcode: '7891234567890',
  categoryId: 'category',
  unitId: 'unit',
  costPrice: '1.299,90',
  salePrice: '1.999,99',
});

describe('productSchema', () => {
  it('aceita os campos obrigatórios válidos', () => {
    expect(productSchema.safeParse(valid()).success).toBe(true);
  });

  it.each(['', 'PROD 001', 'PROD@001'])('rejeita SKU inválido %s', (sku) => {
    expect(productSchema.safeParse({ ...valid(), sku }).success).toBe(false);
  });

  it.each(['1234567', '123456789012345', '789ABC1234567'])(
    'rejeita código de barras inválido %s',
    (barcode) => expect(productSchema.safeParse({ ...valid(), barcode }).success).toBe(false),
  );

  it('rejeita preços e medidas negativos', () => {
    expect(productSchema.safeParse({ ...valid(), salePrice: '-1,00' }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid(), weight: '-0,001' }).success).toBe(false);
  });

  it('normaliza moeda brasileira sem converter para number', () => {
    expect(normalizeDecimal('1.299,90')).toBe('1299.90');
    expect(normalizeDecimal('1.299')).toBe('1299');
    expect(normalizeDecimal('12.30')).toBe('12.30');
  });

  it('monta o payload com SKU em maiúsculas e opcionais nulos', () => {
    expect(toProductInput({ ...valid(), primarySupplierId: 'none', weight: '' })).toMatchObject({
      sku: 'CAFE-001',
      costPrice: '1299.90',
      primarySupplierId: null,
      weight: null,
    });
  });

  it('formata decimais exatos em pt-BR', () => {
    expect(formatDecimalPtBr('1234567.5', 3)).toBe('1.234.567,500');
    expect(formatCurrency('1299.9')).toBe('R$ 1.299,90');
  });

  it('converte produto da API para o formulário', () => {
    const values = productToForm({
      id: '1',
      name: 'Produto',
      description: null,
      sku: 'P-1',
      barcode: null,
      costPrice: '10.50',
      salePrice: '20.00',
      weight: null,
      height: null,
      width: null,
      length: null,
      minimumStock: '2.500',
      isActive: true,
      category: { id: 'c', name: 'Categoria', isActive: true },
      unit: { id: 'u', name: 'Unidade', symbol: 'UN', isActive: true },
      primarySupplier: null,
      createdAt: '',
      updatedAt: '',
    });
    expect(values).toMatchObject({
      costPrice: '10,50',
      minimumStock: '2,500',
      primarySupplierId: 'none',
    });
  });
});
