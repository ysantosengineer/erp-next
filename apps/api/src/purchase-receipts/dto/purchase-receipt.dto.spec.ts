import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { CreatePurchaseReceiptDto, ListPurchaseReceiptsQueryDto } from './purchase-receipt.dto';

describe('Purchase receipt DTOs', () => {
  it('aceita payload mínimo válido e remove espaços das observações', async () => {
    const dto = plainToInstance(CreatePurchaseReceiptDto, {
      purchaseOrderId: randomUUID(),
      idempotencyKey: randomUUID(),
      notes: '  Conferido  ',
      items: [
        {
          purchaseOrderItemId: randomUUID(),
          locationId: randomUUID(),
          receivedQuantity: '1.2500',
        },
      ],
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.notes).toBe('Conferido');
  });

  it.each(['0', '-1', '1.00001', 'abc'])('rejeita quantidade %s', async (quantity) => {
    const dto = plainToInstance(CreatePurchaseReceiptDto, {
      purchaseOrderId: randomUUID(),
      idempotencyKey: randomUUID(),
      items: [
        {
          purchaseOrderItemId: randomUUID(),
          locationId: randomUUID(),
          receivedQuantity: quantity,
        },
      ],
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('aplica paginação segura por padrão', async () => {
    const query = plainToInstance(ListPurchaseReceiptsQueryDto, {});
    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ page: 1, limit: 20, sortBy: 'receivedAt', sortOrder: 'desc' });
  });
});
