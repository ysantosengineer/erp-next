import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto, ListProductsQueryDto, ProductSortField, SortOrder } from './product.dto';

const validProduct = {
  name: 'Produto teste',
  sku: 'prod-001',
  barcode: '7891234567890',
  categoryId: '10000000-0000-4000-8000-000000000001',
  unitId: '20000000-0000-4000-8000-000000000001',
  costPrice: '10.50',
  salePrice: '20.99',
};

describe('Product DTO validation', () => {
  const errorsFor = async (input: Record<string, unknown>) =>
    validate(plainToInstance(CreateProductDto, input));

  it('normaliza espaços do nome, SKU em maiúsculas e código de barras', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...validProduct,
      name: '  Produto teste  ',
      sku: '  prod-001  ',
      barcode: ' 7891234567890 ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.name).toBe('Produto teste');
    expect(dto.sku).toBe('PROD-001');
    expect(dto.barcode).toBe('7891234567890');
  });

  it.each([
    ['', 'SKU obrigatório'],
    ['PROD 001', 'espaços não permitidos'],
    ['PROD@001', 'caractere inválido'],
  ])('rejeita SKU inválido: %s (%s)', async (sku) => {
    expect(await errorsFor({ ...validProduct, sku })).not.toHaveLength(0);
  });

  it.each(['1234567', '123456789012345', '789ABC1234567'])(
    'rejeita código de barras inválido: %s',
    async (barcode) => {
      expect(await errorsFor({ ...validProduct, barcode })).not.toHaveLength(0);
    },
  );

  it('aceita código de barras vazio como nulo', async () => {
    const dto = plainToInstance(CreateProductDto, { ...validProduct, barcode: '   ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.barcode).toBeNull();
  });

  it.each([
    ['costPrice', '-1.00'],
    ['salePrice', '1.001'],
    ['weight', '-0.001'],
    ['height', '1.0001'],
    ['width', 'abc'],
    ['length', '-2'],
    ['minimumStock', '-1'],
  ])('rejeita decimal inválido em %s', async (field, value) => {
    expect(await errorsFor({ ...validProduct, [field]: value })).not.toHaveLength(0);
  });

  it('aceita zero e precisão monetária/logística prevista', async () => {
    expect(
      await errorsFor({
        ...validProduct,
        costPrice: '0',
        salePrice: '999999999999.99',
        weight: '0.001',
        minimumStock: '10.125',
      }),
    ).toHaveLength(0);
  });

  it('converte e valida paginação, ordenação e filtros', async () => {
    const dto = plainToInstance(ListProductsQueryDto, {
      page: '2',
      limit: '50',
      sortBy: ProductSortField.SALE_PRICE,
      sortOrder: SortOrder.DESC,
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);
  });

  it('rejeita limite e ordenação fora da lista permitida', async () => {
    const dto = plainToInstance(ListProductsQueryDto, {
      page: '0',
      limit: '101',
      sortBy: 'currentStock',
      sortOrder: 'sideways',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
