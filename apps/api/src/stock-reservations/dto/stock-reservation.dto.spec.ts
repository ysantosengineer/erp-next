import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListStockReservationsQueryDto, ShipSalesOrderDto } from './stock-reservation.dto';

describe('Stock reservation DTOs', () => {
  it('transforma paginação e aceita filtros válidos', async () => {
    const dto = plainToInstance(ListStockReservationsQueryDto, {
      page: '2',
      limit: '30',
      status: 'ACTIVE',
      startDate: '2026-08-01',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(30);
  });

  it('rejeita status e limite inválidos', async () => {
    const dto = plainToInstance(ListStockReservationsQueryDto, { limit: '101', status: 'UNKNOWN' });
    expect((await validate(dto)).length).toBeGreaterThanOrEqual(2);
  });

  it('normaliza observação de expedição', async () => {
    const dto = plainToInstance(ShipSalesOrderDto, { notes: '  Separar com cuidado  ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.notes).toBe('Separar com cuidado');
  });
});
