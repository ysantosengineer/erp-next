import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSalesOrderDto } from './sales-order.dto';

describe('CreateSalesOrderDto', () => {
  const valid = {
    customerId: '10000000-0000-4000-8000-000000000001',
    warehouseId: '20000000-0000-4000-8000-000000000001',
    items: [
      {
        productId: '30000000-0000-4000-8000-000000000001',
        quantity: '1.2500',
        unitPrice: '10.50',
        discountAmount: '0.25',
      },
    ],
  };

  it('aceita quantidade fracionária, preço e descontos decimais canônicos', async () => {
    expect(await validate(plainToInstance(CreateSalesOrderDto, valid))).toHaveLength(0);
  });

  it.each([
    ['0', '10.00', '0'],
    ['-1', '10.00', '0'],
    ['1', '-0.01', '0'],
    ['1', '10.00', '-1'],
  ])(
    'rejeita quantidade, preço ou desconto malformado',
    async (quantity, unitPrice, discountAmount) => {
      const dto = plainToInstance(CreateSalesOrderDto, {
        ...valid,
        items: [{ ...valid.items[0], quantity, unitPrice, discountAmount }],
      });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it('rejeita pedido vazio e campos controlados pelo servidor', async () => {
    expect(
      await validate(plainToInstance(CreateSalesOrderDto, { ...valid, items: [] })),
    ).not.toHaveLength(0);
    const controlled = plainToInstance(CreateSalesOrderDto, { ...valid, status: 'CONFIRMED' });
    await validate(controlled, { whitelist: true });
    expect(Object.hasOwn(controlled, 'status')).toBe(false);
  });
});
