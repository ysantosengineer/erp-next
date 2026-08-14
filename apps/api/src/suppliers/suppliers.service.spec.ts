import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, SupplierType } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SuppliersService } from './suppliers.service';
describe('SuppliersService', () => {
  const identity = {
    userId: '10000000-0000-4000-8000-000000000001',
    companyId: '20000000-0000-4000-8000-000000000001',
    companyName: 'Empresa',
    name: 'Admin',
    email: 'a@a.com',
    authVersion: 1,
    roles: [],
    permissions: [],
  } as AuthenticatedUser;
  const base = {
    id: '40000000-0000-4000-8000-000000000001',
    companyId: identity.companyId,
    type: SupplierType.INDIVIDUAL,
    name: 'Maria',
    tradeName: null,
    document: '52998224725',
    email: null,
    phone: null,
    contactName: null,
    notes: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    addresses: [],
  };
  const tx = {
    supplier: { create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    supplier: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new SuppliersService(prisma as never);
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((v: unknown) =>
      Array.isArray(v) ? Promise.all(v) : (v as (t: typeof tx) => Promise<unknown>)(tx),
    );
    prisma.supplier.findFirst.mockResolvedValue(base);
    tx.supplier.create.mockResolvedValue(base);
    tx.supplier.update.mockResolvedValue(base);
    tx.auditLog.create.mockResolvedValue({});
  });
  it('cria e normaliza PF', async () => {
    await service.create(
      identity,
      {
        type: SupplierType.INDIVIDUAL,
        name: 'Maria',
        document: '529.982.247-25',
        phone: '(41) 99999-9999',
      },
      'r',
    );
    expect(tx.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: identity.companyId,
          document: '52998224725',
          phone: '41999999999',
        }),
      }),
    );
  });
  it('rejeita documento inválido', async () => {
    await expect(
      service.create(
        identity,
        { type: SupplierType.COMPANY, name: 'Empresa', document: '52998224725' },
        'r',
      ),
    ).rejects.toEqual(expect.any(BadRequestException));
  });
  it('traduz duplicidade', async () => {
    tx.supplier.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.0',
      }),
    );
    await expect(
      service.create(
        identity,
        { type: SupplierType.INDIVIDUAL, name: 'Maria', document: base.document },
        'r',
      ),
    ).rejects.toEqual(expect.any(ConflictException));
  });
  it('isola busca por tenant', async () => {
    prisma.supplier.findFirst.mockResolvedValue(null);
    await expect(service.findOne(identity, base.id)).rejects.toEqual(expect.any(NotFoundException));
    expect(prisma.supplier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: base.id, companyId: identity.companyId } }),
    );
  });
  it('altera status com auditoria', async () => {
    await service.updateStatus(identity, base.id, false, 'r');
    expect(tx.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});
