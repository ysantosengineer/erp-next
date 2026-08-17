import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SortOrder, WarehouseSortField, WarehouseStatusFilter } from './dto/warehouse.dto';
import { WarehousesService } from './warehouses.service';

describe('WarehousesService', () => {
  const identity = {
    userId: '10000000-0000-4000-8000-000000000001',
    companyId: '20000000-0000-4000-8000-000000000001',
  } as AuthenticatedUser;
  const warehouseId = '30000000-0000-4000-8000-000000000001';
  const base = {
    id: warehouseId,
    companyId: identity.companyId,
    name: 'Principal',
    code: 'MAIN',
    description: null,
    isActive: true,
    createdAt: new Date('2026-08-17T12:00:00Z'),
    updatedAt: new Date('2026-08-17T12:00:00Z'),
    _count: { locations: 2 },
  };
  const tx = {
    warehouse: { create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    warehouse: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    stockLocation: { count: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new WarehousesService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((value: unknown) =>
      Array.isArray(value)
        ? Promise.all(value)
        : (value as (client: typeof tx) => Promise<unknown>)(tx),
    );
    prisma.warehouse.findFirst.mockResolvedValue(base);
    prisma.stockLocation.count.mockResolvedValue(0);
    tx.warehouse.create.mockResolvedValue(base);
    tx.warehouse.update.mockResolvedValue(base);
    tx.auditLog.create.mockResolvedValue({});
  });

  it('cria depósito no tenant e normaliza o código', async () => {
    const result = await service.create(
      identity,
      { name: ' Principal ', code: ' main ' },
      'request-1',
    );
    expect(tx.warehouse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: identity.companyId,
          name: 'Principal',
          code: 'MAIN',
        }),
      }),
    );
    expect(result.locationCount).toBe(2);
  });

  it('audita criação com ator e request id', async () => {
    await service.create(identity, { name: 'Principal', code: 'MAIN' }, 'request-audit');
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: identity.userId,
        companyId: identity.companyId,
        action: 'warehouse.created',
        requestId: 'request-audit',
      }),
    });
  });

  it('traduz código duplicado no mesmo tenant', async () => {
    tx.warehouse.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );
    await expect(
      service.create(identity, { name: 'Principal', code: 'MAIN' }, 'r'),
    ).rejects.toEqual(expect.any(ConflictException));
  });

  it('permite o mesmo código em outro tenant ao sempre compor companyId', async () => {
    const other = { ...identity, companyId: '20000000-0000-4000-8000-000000000002' };
    await service.create(other, { name: 'Principal', code: 'MAIN' }, 'r');
    expect(tx.warehouse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: other.companyId, code: 'MAIN' }),
      }),
    );
  });

  it('lista com pesquisa, status, paginação e ordenação', async () => {
    prisma.warehouse.findMany.mockResolvedValue([base]);
    prisma.warehouse.count.mockResolvedValue(1);
    const result = await service.findAll(identity, {
      page: 2,
      limit: 10,
      search: 'main',
      status: WarehouseStatusFilter.ACTIVE,
      sortBy: WarehouseSortField.CODE,
      sortOrder: SortOrder.DESC,
    });
    expect(prisma.warehouse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: identity.companyId,
          isActive: true,
          OR: expect.any(Array),
        }),
        skip: 10,
        take: 10,
        orderBy: { code: 'desc' },
      }),
    );
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 1, totalPages: 1 });
  });

  it('busca por id com tenant', async () => {
    await service.findOne(identity, warehouseId);
    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: warehouseId, companyId: identity.companyId } }),
    );
  });

  it('não revela depósito cross-tenant', async () => {
    prisma.warehouse.findFirst.mockResolvedValueOnce(null);
    await expect(service.findOne(identity, warehouseId)).rejects.toEqual(
      expect.any(NotFoundException),
    );
  });

  it('edita campos permitidos e audita campos alterados', async () => {
    await service.update(
      identity,
      warehouseId,
      { name: 'Novo', code: ' sec ', description: ' Apoio ' },
      'r',
    );
    expect(tx.warehouse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: warehouseId },
        data: { name: 'Novo', code: 'SEC', description: 'Apoio' },
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'warehouse.updated',
        before: expect.any(Object),
        after: expect.objectContaining({ changedFields: ['name', 'code', 'description'] }),
      }),
    });
  });

  it('rejeita null em nome obrigatório', async () => {
    await expect(
      service.update(identity, warehouseId, { name: null } as never, 'r'),
    ).rejects.toEqual(expect.any(BadRequestException));
  });

  it('bloqueia inativação com endereços ativos', async () => {
    prisma.stockLocation.count.mockResolvedValueOnce(1);
    await expect(service.updateStatus(identity, warehouseId, false, 'r')).rejects.toEqual(
      expect.any(UnprocessableEntityException),
    );
    expect(tx.warehouse.update).not.toHaveBeenCalled();
  });

  it.each([
    [false, 'warehouse.deactivated'],
    [true, 'warehouse.activated'],
  ] as const)('altera status para %s com auditoria', async (isActive, action) => {
    tx.warehouse.update.mockResolvedValueOnce({ ...base, isActive });
    const result = await service.updateStatus(identity, warehouseId, isActive, 'r');
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action, before: { isActive: true }, after: { isActive } }),
    });
    expect(result.isActive).toBe(isActive);
  });
});
