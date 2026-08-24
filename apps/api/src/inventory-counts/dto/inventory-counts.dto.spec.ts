import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateInventoryCountDto,
  ListInventoryCountsQueryDto,
  SubmitInventoryCountQuantityDto,
} from './inventory-counts.dto';

describe('Inventory count DTOs', () => {
  it('aceita zero e quatro casas, mas rejeita quantidade negativa', async () => {
    await expect(
      validate(plainToInstance(SubmitInventoryCountQuantityDto, { quantity: '0.0000' })),
    ).resolves.toHaveLength(0);
    await expect(
      validate(plainToInstance(SubmitInventoryCountQuantityDto, { quantity: '-1' })),
    ).resolves.not.toHaveLength(0);
  });

  it('valida depósito e aplica paginação padrão', async () => {
    const create = plainToInstance(CreateInventoryCountDto, { warehouseId: 'invalid' });
    expect(await validate(create)).not.toHaveLength(0);
    const query = plainToInstance(ListInventoryCountsQueryDto, {});
    expect(await validate(query)).toHaveLength(0);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });
});
