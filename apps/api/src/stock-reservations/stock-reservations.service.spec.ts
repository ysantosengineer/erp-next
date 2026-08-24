import { NotFoundException } from '@nestjs/common';
import { Prisma, StockReservationStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { StockReservationsService } from './stock-reservations.service';

const identity: AuthenticatedUser = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  companyId: '550e8400-e29b-41d4-a716-446655440001',
  companyName: 'Empresa',
  name: 'Usuário',
  email: 'user@example.com',
  authVersion: 1,
  roles: [],
  permissions: [],
};

const reservation = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  companyId: identity.companyId,
  salesOrderId: '550e8400-e29b-41d4-a716-446655440011',
  salesOrderItemId: '550e8400-e29b-41d4-a716-446655440012',
  productId: '550e8400-e29b-41d4-a716-446655440013',
  locationId: '550e8400-e29b-41d4-a716-446655440014',
  quantity: new Prisma.Decimal(2),
  status: StockReservationStatus.ACTIVE,
  createdByUserId: identity.userId,
  releasedByUserId: null,
  consumedByUserId: null,
  createdAt: new Date('2026-08-24T12:00:00Z'),
  updatedAt: new Date('2026-08-24T12:00:00Z'),
  releasedAt: null,
  consumedAt: null,
  salesOrder: {
    id: '550e8400-e29b-41d4-a716-446655440011',
    number: 'SO-000001',
    status: 'RESERVED',
  },
  product: {
    id: '550e8400-e29b-41d4-a716-446655440013',
    name: 'Café',
    sku: 'CAF-1',
    unit: { symbol: 'UN' },
  },
  location: {
    id: '550e8400-e29b-41d4-a716-446655440014',
    code: 'A-01',
    warehouse: { id: '550e8400-e29b-41d4-a716-446655440015', name: 'Principal', code: 'MAIN' },
  },
  createdBy: { id: identity.userId, name: 'Usuário' },
  releasedBy: null,
  consumedBy: null,
};

describe('StockReservationsService', () => {
  it('isola listagem por empresa e calcula paginação', async () => {
    const findMany = jest.fn();
    const count = jest.fn();
    const transaction = jest.fn().mockResolvedValue([[reservation], 1]);
    const service = new StockReservationsService(
      {
        stockReservation: { findMany, count },
        $transaction: transaction,
      } as never,
      {} as never,
    );
    const result = await service.findAll(identity, {
      page: 1,
      limit: 20,
      status: StockReservationStatus.ACTIVE,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: identity.companyId,
          status: StockReservationStatus.ACTIVE,
        }),
      }),
    );
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(result.data[0]).toEqual(
      expect.objectContaining({ quantity: '2.0000', status: 'ACTIVE' }),
    );
  });

  it('não encontra reserva de outra empresa', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new StockReservationsService(
      { stockReservation: { findFirst } } as never,
      {} as never,
    );
    await expect(service.findOne(identity, reservation.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: reservation.id, companyId: identity.companyId } }),
    );
  });
});
