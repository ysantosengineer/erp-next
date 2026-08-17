import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerType, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CustomerSortField, CustomerStatusFilter, SortOrder } from './dto/customer.dto';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const identity = {
    userId: '10000000-0000-4000-8000-000000000001',
    companyId: '20000000-0000-4000-8000-000000000001',
    companyName: 'Empresa',
    name: 'Admin',
    email: 'admin@example.com',
    authVersion: 1,
    roles: [],
    permissions: [],
  } as AuthenticatedUser;
  const customerId = '40000000-0000-4000-8000-000000000001';
  const address = {
    id: '50000000-0000-4000-8000-000000000001',
    customerId,
    type: 'MAIN',
    postalCode: '80010000',
    street: 'Rua das Flores',
    number: '10',
    complement: null,
    district: 'Centro',
    city: 'Curitiba',
    state: 'PR',
    country: 'BR',
    isPrimary: true,
    createdAt: new Date('2026-08-17T12:00:00.000Z'),
    updatedAt: new Date('2026-08-17T12:00:00.000Z'),
  };
  const base = {
    id: customerId,
    companyId: identity.companyId,
    type: CustomerType.INDIVIDUAL,
    name: 'Maria',
    tradeName: null,
    document: '52998224725',
    email: 'maria@example.com',
    phone: '41999999999',
    creditLimit: new Prisma.Decimal('1500.50'),
    notes: null,
    isActive: true,
    createdAt: new Date('2026-08-17T12:00:00.000Z'),
    updatedAt: new Date('2026-08-17T12:00:00.000Z'),
    addresses: [address],
  };
  const tx = {
    customer: { create: jest.fn(), update: jest.fn() },
    customerAddress: { deleteMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    customer: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new CustomersService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((value: unknown) =>
      Array.isArray(value)
        ? Promise.all(value)
        : (value as (client: typeof tx) => Promise<unknown>)(tx),
    );
    prisma.customer.findFirst.mockResolvedValue(base);
    tx.customer.create.mockResolvedValue(base);
    tx.customer.update.mockResolvedValue(base);
    tx.customerAddress.deleteMany.mockResolvedValue({ count: 1 });
    tx.auditLog.create.mockResolvedValue({});
  });

  it('cria PF no tenant e normaliza os dados', async () => {
    const result = await service.create(
      identity,
      {
        type: CustomerType.INDIVIDUAL,
        name: '  Maria  ',
        document: '529.982.247-25',
        phone: '(41) 99999-9999',
        creditLimit: '1500.50',
      },
      'request-1',
    );
    expect(tx.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: identity.companyId,
          name: 'Maria',
          document: '52998224725',
          phone: '41999999999',
          creditLimit: new Prisma.Decimal('1500.50'),
        }),
      }),
    );
    expect(result.creditLimit).toBe('1500.50');
  });

  it('cria PJ válida', async () => {
    await service.create(
      identity,
      { type: CustomerType.COMPANY, name: 'Empresa', document: '04.252.011/0001-10' },
      'r',
    );
    expect(tx.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ document: '04252011000110' }) }),
    );
  });

  it('usa limite zero quando omitido', async () => {
    await service.create(
      identity,
      { type: CustomerType.INDIVIDUAL, name: 'Maria', document: base.document },
      'r',
    );
    expect(tx.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ creditLimit: new Prisma.Decimal(0) }),
      }),
    );
  });

  it.each([
    [CustomerType.INDIVIDUAL, '52998224724'],
    [CustomerType.COMPANY, '04252011000111'],
    [CustomerType.COMPANY, '52998224725'],
  ] as const)('rejeita documento inválido ou incompatível %s', async (type, document) => {
    await expect(
      service.create(identity, { type, name: 'Cliente', document }, 'r'),
    ).rejects.toEqual(expect.any(BadRequestException));
  });

  it('traduz documento duplicado na mesma empresa', async () => {
    tx.customer.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );
    await expect(
      service.create(
        identity,
        { type: CustomerType.INDIVIDUAL, name: 'Maria', document: base.document },
        'r',
      ),
    ).rejects.toEqual(expect.any(ConflictException));
  });

  it('audita sem documento, email, telefone ou endereço', async () => {
    await service.create(
      identity,
      { type: CustomerType.INDIVIDUAL, name: 'Maria', document: base.document },
      'request-audit',
    );
    const auditData = tx.auditLog.create.mock.calls[0][0].data;
    expect(auditData).toEqual(expect.objectContaining({ action: 'customer.created' }));
    expect(auditData.after).toEqual(
      expect.objectContaining({ creditLimit: '1500.50', hasAddress: true }),
    );
    expect(auditData.after).not.toHaveProperty('document');
    expect(auditData.after).not.toHaveProperty('email');
    expect(auditData.after).not.toHaveProperty('phone');
    expect(auditData.after).not.toHaveProperty('address');
  });

  it('lista com tenant, pesquisa, filtros, paginação e ordenação', async () => {
    prisma.customer.findMany.mockResolvedValue([base]);
    prisma.customer.count.mockResolvedValue(1);
    const result = await service.findAll(identity, {
      page: 2,
      limit: 10,
      search: '529.982',
      status: CustomerStatusFilter.ACTIVE,
      type: CustomerType.INDIVIDUAL,
      sortBy: CustomerSortField.CREDIT_LIMIT,
      sortOrder: SortOrder.DESC,
    });
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: identity.companyId,
          isActive: true,
          type: CustomerType.INDIVIDUAL,
          OR: expect.any(Array),
        }),
        skip: 10,
        take: 10,
        orderBy: { creditLimit: 'desc' },
      }),
    );
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 1, totalPages: 1 });
  });

  it('busca por ID sempre com tenant', async () => {
    await service.findOne(identity, customerId);
    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: customerId, companyId: identity.companyId } }),
    );
  });

  it('não revela cliente de outro tenant', async () => {
    prisma.customer.findFirst.mockResolvedValueOnce(null);
    await expect(service.findOne(identity, customerId)).rejects.toEqual(
      expect.any(NotFoundException),
    );
  });

  it('edita limite com Decimal e revalida documento', async () => {
    const updated = {
      ...base,
      type: CustomerType.COMPANY,
      document: '04252011000110',
      creditLimit: new Prisma.Decimal('999.99'),
    };
    tx.customer.update.mockResolvedValueOnce(updated);
    const result = await service.update(
      identity,
      customerId,
      { type: CustomerType.COMPANY, document: '04.252.011/0001-10', creditLimit: '999.99' },
      'r',
    );
    expect(tx.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          document: '04252011000110',
          creditLimit: new Prisma.Decimal('999.99'),
        }),
      }),
    );
    expect(result.creditLimit).toBe('999.99');
  });

  it('substitui endereço principal de forma transacional', async () => {
    await service.update(
      identity,
      customerId,
      { address: { postalCode: '80010-000', street: 'Rua Nova', state: 'pr' } },
      'r',
    );
    expect(tx.customerAddress.deleteMany).toHaveBeenCalledWith({
      where: { customerId, isPrimary: true },
    });
    expect(tx.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          addresses: {
            create: expect.objectContaining({ postalCode: '80010000', state: 'PR' }),
          },
        }),
      }),
    );
  });

  it('remove endereço quando recebe null', async () => {
    await service.update(identity, customerId, { address: null }, 'r');
    expect(tx.customerAddress.deleteMany).toHaveBeenCalled();
    expect(tx.customer.update.mock.calls[0][0].data).not.toHaveProperty('addresses');
  });

  it('rejeita null nos campos obrigatórios da edição', async () => {
    await expect(
      service.update(
        identity,
        customerId,
        { creditLimit: null } as unknown as Parameters<typeof service.update>[2],
        'r',
      ),
    ).rejects.toEqual(expect.any(BadRequestException));
    expect(prisma.customer.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    [false, 'customer.deactivated'],
    [true, 'customer.activated'],
  ] as const)('altera status para %s com auditoria', async (isActive, action) => {
    tx.customer.update.mockResolvedValueOnce({ ...base, isActive });
    const result = await service.updateStatus(identity, customerId, isActive, 'request-status');
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action, before: { isActive: true }, after: { isActive } }),
    });
    expect(result.isActive).toBe(isActive);
  });
});
