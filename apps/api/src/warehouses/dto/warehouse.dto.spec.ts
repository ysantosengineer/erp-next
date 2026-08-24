import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWarehouseDto, ListWarehousesQueryDto } from './warehouse.dto';

describe('Warehouse DTOs', () => {
  it('exige código', async () => {
    expect(
      await validate(plainToInstance(CreateWarehouseDto, { name: 'Principal' })),
    ).not.toHaveLength(0);
  });
  it('normaliza código válido', async () => {
    const dto = plainToInstance(CreateWarehouseDto, { name: 'Principal', code: ' main-01 ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.code).toBe('MAIN-01');
  });
  it('rejeita ordenação fora da whitelist', async () => {
    expect(
      await validate(plainToInstance(ListWarehousesQueryDto, { sortBy: 'companyId' })),
    ).not.toHaveLength(0);
  });
});
