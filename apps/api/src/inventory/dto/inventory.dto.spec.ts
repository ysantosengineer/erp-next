import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StockAdjustmentDto, StockEntryDto, StockTransferDto } from './inventory.dto';

const productId = '550e8400-e29b-41d4-a716-446655440000';
const locationId = '550e8400-e29b-41d4-a716-446655440001';

describe('Inventory movement DTOs', () => {
  it('aceita quantidade positiva com quatro casas', async () => {
    const dto = plainToInstance(StockEntryDto, {
      productId,
      destinationLocationId: locationId,
      quantity: '10.2500',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('aceita quantidade fracionária positiva com zeros finais', async () => {
    const dto = plainToInstance(StockEntryDto, {
      productId,
      destinationLocationId: locationId,
      quantity: '0.0100',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it.each(['0', '-1', '1.00001', 'abc'])('rejeita quantidade inválida %s', async (quantity) => {
    const dto = plainToInstance(StockEntryDto, {
      productId,
      destinationLocationId: locationId,
      quantity,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('exige motivo não vazio no ajuste', async () => {
    const dto = plainToInstance(StockAdjustmentDto, {
      productId,
      locationId,
      quantity: '1',
      direction: 'IN',
      reason: '   ',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('valida os dois endereços da transferência', async () => {
    const dto = plainToInstance(StockTransferDto, {
      productId,
      sourceLocationId: locationId,
      destinationLocationId: 'inválido',
      quantity: '1',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
