import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePurchaseOrderDto } from './purchase-order.dto';

describe('CreatePurchaseOrderDto', () => {
  const valid = {
    supplierId: '10000000-0000-4000-8000-000000000001',
    warehouseId: '20000000-0000-4000-8000-000000000001',
    items: [
      { productId: '30000000-0000-4000-8000-000000000001', quantity: '1.2500', unitCost: '10.50' },
    ],
  };
  it('aceita quantidade fracionária e valores decimais canônicos', async () => {
    expect(await validate(plainToInstance(CreatePurchaseOrderDto, valid))).toHaveLength(0);
  });
  it.each([
    ['0', '10.00'],
    ['-1', '10.00'],
    ['1', '-0.01'],
  ])('rejeita quantidade/custo inválido', async (quantity, unitCost) => {
    const dto = plainToInstance(CreatePurchaseOrderDto, {
      ...valid,
      items: [{ ...valid.items[0], quantity, unitCost }],
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
  it('rejeita pedido vazio', async () => {
    expect(
      await validate(plainToInstance(CreatePurchaseOrderDto, { ...valid, items: [] })),
    ).not.toHaveLength(0);
  });
});
