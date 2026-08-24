import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateStockLocationDto,
  ListStockLocationsQueryDto,
  StockLocationSortField,
  StockLocationStatusFilter,
} from './stock-location.dto';

describe('Stock location DTOs', () => {
  it('exige código válido', async () => {
    expect(await validate(plainToInstance(CreateStockLocationDto, {}))).not.toHaveLength(0);
    expect(
      await validate(plainToInstance(CreateStockLocationDto, { code: 'endereço com espaço' })),
    ).not.toHaveLength(0);
  });

  it('normaliza código e posição física', async () => {
    const dto = plainToInstance(CreateStockLocationDto, {
      code: ' a-01 ',
      zone: ' recebimento ',
      aisle: ' corredor-a ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toEqual(
      expect.objectContaining({ code: 'A-01', zone: 'RECEBIMENTO', aisle: 'CORREDOR-A' }),
    );
  });

  it.each(['-1', '1.0000', '123456789012.000', '1,5'])(
    'rejeita capacidade inválida %s',
    async (capacity) => {
      const dto = plainToInstance(CreateStockLocationDto, { code: 'A-01', capacity });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it('aceita capacidade não negativa com três casas', async () => {
    const dto = plainToInstance(CreateStockLocationDto, { code: 'A-01', capacity: '100.125' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('aplica defaults e whitelist de filtros', async () => {
    const dto = plainToInstance(ListStockLocationsQueryDto, {
      page: '2',
      limit: '10',
      zone: ' a ',
      status: StockLocationStatusFilter.ACTIVE,
      sortBy: StockLocationSortField.ZONE,
      sortOrder: 'desc',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toEqual(
      expect.objectContaining({ page: 2, limit: 10, zone: 'A', sortBy: 'zone', sortOrder: 'desc' }),
    );
  });

  it('rejeita campo de ordenação não permitido', async () => {
    const dto = plainToInstance(ListStockLocationsQueryDto, { sortBy: 'companyId' });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
