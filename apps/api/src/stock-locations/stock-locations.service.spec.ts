import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  SortOrder,
  StockLocationSortField,
  StockLocationStatusFilter,
} from './dto/stock-location.dto';
import { StockLocationsService } from './stock-locations.service';

describe('StockLocationsService', () => {
  const identity = {
    userId: '10000000-0000-4000-8000-000000000001',
    companyId: '20000000-0000-4000-8000-000000000001',
  } as AuthenticatedUser;
  const warehouseId = '30000000-0000-4000-8000-000000000001';
  const locationId = '40000000-0000-4000-8000-000000000001';
  const warehouse = {
    id: warehouseId,
    companyId: identity.companyId,
    name: 'Principal',
    code: 'MAIN',
    description: null,
    isActive: true,
    createdAt: new Date('2026-08-17T12:00:00Z'),
    updatedAt: new Date('2026-08-17T12:00:00Z'),
  };
  const base = {
    id: locationId,
    companyId: identity.companyId,
    warehouseId,
    code: 'A-01',
    description: null,
    zone: 'A',
    aisle: '01',
    rack: null,
    level: null,
    position: null,
    capacity: new Prisma.Decimal('100.125'),
    isActive: true,
    createdAt: new Date('2026-08-17T12:00:00Z'),
    updatedAt: new Date('2026-08-17T12:00:00Z'),
  };
  const tx = {
    stockLocation: { create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    warehouse: { findFirst: jest.fn() },
    stockLocation: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new StockLocationsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((value: unknown) =>
      Array.isArray(value)
        ? Promise.all(value)
        : (value as (client: typeof tx) => Promise<unknown>)(tx),
    );
    prisma.warehouse.findFirst.mockResolvedValue(warehouse);
    prisma.stockLocation.findFirst.mockResolvedValue(base);
    tx.stockLocation.create.mockResolvedValue(base);
    tx.stockLocation.update.mockResolvedValue(base);
    tx.auditLog.create.mockResolvedValue({});
  });

  it('cria no tenant e depósito corretos com campos normalizados', async () => {
    const result = await service.create(
      identity,
      warehouseId,
      { code: ' a-01 ', zone: ' a ', aisle: ' 01 ', capacity: '100.125' },
      'r',
    );
    expect(tx.stockLocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: identity.companyId,
        warehouseId,
        code: 'A-01',
        zone: 'A',
        aisle: '01',
        capacity: new Prisma.Decimal('100.125'),
      }),
    });
    expect(result.capacity).toBe('100.125');
  });

  it('audita a criação', async () => {
    await service.create(identity, warehouseId, { code: 'A-01' }, 'request-audit');
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: identity.userId,
        companyId: identity.companyId,
        action: 'stock_location.created',
        requestId: 'request-audit',
      }),
    });
  });

  it('traduz código duplicado no mesmo depósito', async () => {
    tx.stockLocation.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );
    await expect(service.create(identity, warehouseId, { code: 'A-01' }, 'r')).rejects.toEqual(
      expect.any(ConflictException),
    );
  });

  it('compõe warehouseId permitindo o mesmo código em outro depósito', async () => {
    const otherWarehouseId = '30000000-0000-4000-8000-000000000002';
    prisma.warehouse.findFirst.mockResolvedValueOnce({ ...warehouse, id: otherWarehouseId });
    await service.create(identity, otherWarehouseId, { code: 'A-01' }, 'r');
    expect(tx.stockLocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ warehouseId: otherWarehouseId, code: 'A-01' }),
    });
  });

  it('não cria quando o depósito não pertence ao tenant', async () => {
    prisma.warehouse.findFirst.mockResolvedValueOnce(null);
    await expect(service.create(identity, warehouseId, { code: 'A-01' }, 'r')).rejects.toEqual(
      expect.any(NotFoundException),
    );
  });

  it('não cria em depósito inativo', async () => {
    prisma.warehouse.findFirst.mockResolvedValueOnce({ ...warehouse, isActive: false });
    await expect(service.create(identity, warehouseId, { code: 'A-01' }, 'r')).rejects.toEqual(
      expect.any(UnprocessableEntityException),
    );
  });

  it('lista com contexto, filtros, paginação e escopo simultâneo', async () => {
    prisma.stockLocation.findMany.mockResolvedValue([base]);
    prisma.stockLocation.count.mockResolvedValue(1);
    const result = await service.findAll(identity, warehouseId, {
      page: 2,
      limit: 10,
      search: 'a',
      zone: ' a ',
      status: StockLocationStatusFilter.ACTIVE,
      sortBy: StockLocationSortField.ZONE,
      sortOrder: SortOrder.DESC,
    });
    expect(prisma.stockLocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: identity.companyId,
          warehouseId,
          isActive: true,
          zone: 'A',
          OR: expect.any(Array),
        }),
        skip: 10,
        take: 10,
        orderBy: { zone: 'desc' },
      }),
    );
    expect(result.warehouse).toEqual({
      id: warehouseId,
      name: 'Principal',
      code: 'MAIN',
      isActive: true,
    });
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 1, totalPages: 1 });
  });

  it('busca por id, depósito e tenant ao mesmo tempo', async () => {
    await service.findOne(identity, warehouseId, locationId);
    expect(prisma.stockLocation.findFirst).toHaveBeenCalledWith({
      where: { id: locationId, warehouseId, companyId: identity.companyId },
    });
  });

  it('não revela endereço cross-tenant ou de outro depósito', async () => {
    prisma.stockLocation.findFirst.mockResolvedValueOnce(null);
    await expect(service.findOne(identity, warehouseId, locationId)).rejects.toEqual(
      expect.any(NotFoundException),
    );
  });

  it('edita campos físicos, capacidade e audita alterações', async () => {
    await service.update(
      identity,
      warehouseId,
      locationId,
      { code: ' b-02 ', zone: ' b ', capacity: '25.500', description: ' Separação ' },
      'r',
    );
    expect(tx.stockLocation.update).toHaveBeenCalledWith({
      where: { id: locationId },
      data: {
        code: 'B-02',
        zone: 'B',
        capacity: new Prisma.Decimal('25.500'),
        description: 'Separação',
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'stock_location.updated',
        before: expect.any(Object),
        after: expect.objectContaining({
          changedFields: ['code', 'zone', 'capacity', 'description'],
        }),
      }),
    });
  });

  it('permite limpar campos opcionais', async () => {
    await service.update(identity, warehouseId, locationId, { zone: null, capacity: null }, 'r');
    expect(tx.stockLocation.update).toHaveBeenCalledWith({
      where: { id: locationId },
      data: { zone: null, capacity: null },
    });
  });

  it('rejeita código nulo', async () => {
    await expect(
      service.update(identity, warehouseId, locationId, { code: null } as never, 'r'),
    ).rejects.toEqual(expect.any(BadRequestException));
  });

  it.each([
    [false, 'stock_location.deactivated'],
    [true, 'stock_location.activated'],
  ] as const)('altera status para %s e audita', async (isActive, action) => {
    tx.stockLocation.update.mockResolvedValueOnce({ ...base, isActive });
    const result = await service.updateStatus(identity, warehouseId, locationId, isActive, 'r');
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action, before: { isActive: true }, after: { isActive } }),
    });
    expect(result.isActive).toBe(isActive);
  });

  it('bloqueia reativação quando o depósito está inativo', async () => {
    prisma.warehouse.findFirst.mockResolvedValueOnce({ ...warehouse, isActive: false });
    await expect(
      service.updateStatus(identity, warehouseId, locationId, true, 'r'),
    ).rejects.toEqual(expect.any(UnprocessableEntityException));
    expect(tx.stockLocation.update).not.toHaveBeenCalled();
  });
});
