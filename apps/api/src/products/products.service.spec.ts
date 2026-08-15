import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ProductSortField, ProductStatusFilter, SortOrder } from './dto/product.dto';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
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
  const categoryId = '30000000-0000-4000-8000-000000000001';
  const unitId = '40000000-0000-4000-8000-000000000001';
  const supplierId = '50000000-0000-4000-8000-000000000001';
  const productId = '60000000-0000-4000-8000-000000000001';
  const base = {
    id: productId,
    companyId: identity.companyId,
    categoryId,
    unitId,
    primarySupplierId: supplierId,
    name: 'Café Especial',
    description: null,
    sku: 'CAFE-001',
    barcode: '7891234567890',
    costPrice: new Prisma.Decimal('12.3'),
    salePrice: new Prisma.Decimal('20'),
    weight: new Prisma.Decimal('0.5'),
    height: null,
    width: null,
    length: null,
    minimumStock: new Prisma.Decimal('10'),
    isActive: true,
    createdAt: new Date('2026-08-14T12:00:00.000Z'),
    updatedAt: new Date('2026-08-14T12:00:00.000Z'),
    category: { id: categoryId, name: 'Alimentos', isActive: true },
    unit: { id: unitId, name: 'Unidade', symbol: 'UN', isActive: true },
    primarySupplier: {
      id: supplierId,
      name: 'Fornecedor',
      document: '12345678000195',
      isActive: true,
    },
  };
  const activeCategory = { id: categoryId, companyId: identity.companyId, isActive: true };
  const activeUnit = { id: unitId, companyId: identity.companyId, isActive: true };
  const activeSupplier = { id: supplierId, companyId: identity.companyId, isActive: true };
  const tx = {
    product: { create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    product: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    category: { findFirst: jest.fn() },
    unitOfMeasure: { findFirst: jest.fn() },
    supplier: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new ProductsService(prisma as never);
  const createDto = {
    name: '  Café Especial  ',
    sku: ' cafe-001 ',
    barcode: '7891234567890',
    categoryId,
    unitId,
    primarySupplierId: supplierId,
    costPrice: '12.30',
    salePrice: '20.00',
    weight: '0.500',
    minimumStock: '10.000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((value: unknown) =>
      Array.isArray(value)
        ? Promise.all(value)
        : (value as (client: typeof tx) => Promise<unknown>)(tx),
    );
    prisma.product.findFirst.mockResolvedValue(base);
    prisma.category.findFirst.mockResolvedValue(activeCategory);
    prisma.unitOfMeasure.findFirst.mockResolvedValue(activeUnit);
    prisma.supplier.findFirst.mockResolvedValue(activeSupplier);
    tx.product.create.mockResolvedValue(base);
    tx.product.update.mockResolvedValue(base);
    tx.auditLog.create.mockResolvedValue({});
  });

  it('cria produto no tenant e normaliza os dados', async () => {
    const result = await service.create(identity, createDto, 'request-1');
    expect(tx.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: identity.companyId,
          name: 'Café Especial',
          sku: 'CAFE-001',
          costPrice: new Prisma.Decimal('12.30'),
          minimumStock: new Prisma.Decimal('10.000'),
        }),
      }),
    );
    expect(result.costPrice).toBe('12.30');
    expect(result.salePrice).toBe('20.00');
    expect(result.weight).toBe('0.500');
    expect(result.minimumStock).toBe('10.000');
  });

  it('permite fornecedor principal nulo e estoque mínimo padrão zero', async () => {
    await service.create(
      identity,
      { ...createDto, primarySupplierId: null, minimumStock: undefined },
      'request-2',
    );
    expect(prisma.supplier.findFirst).not.toHaveBeenCalled();
    expect(tx.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          primarySupplierId: null,
          minimumStock: new Prisma.Decimal('0'),
        }),
      }),
    );
  });

  it('audita a criação com ator, empresa e request id', async () => {
    await service.create(identity, createDto, 'request-audit');
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: identity.userId,
        companyId: identity.companyId,
        entity: 'Product',
        entityId: productId,
        action: 'product.created',
        requestId: 'request-audit',
      }),
    });
  });

  it.each(['category', 'unitOfMeasure', 'supplier'] as const)(
    'rejeita relacionamento %s ausente ou de outro tenant',
    async (relation) => {
      prisma[relation].findFirst.mockResolvedValueOnce(null);
      await expect(service.create(identity, createDto, 'r')).rejects.toEqual(
        expect.any(NotFoundException),
      );
    },
  );

  it.each(['category', 'unitOfMeasure', 'supplier'] as const)(
    'rejeita novo relacionamento %s inativo',
    async (relation) => {
      prisma[relation].findFirst.mockResolvedValueOnce({ isActive: false });
      await expect(service.create(identity, createDto, 'r')).rejects.toEqual(
        expect.any(UnprocessableEntityException),
      );
    },
  );

  it('traduz SKU duplicado em conflito', async () => {
    tx.product.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['companyId', 'sku'] },
      }),
    );
    await expect(service.create(identity, createDto, 'r')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PRODUCT_SKU_EXISTS' }),
    });
  });

  it('traduz código de barras duplicado em conflito', async () => {
    tx.product.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['companyId', 'barcode'] },
      }),
    );
    await expect(service.create(identity, createDto, 'r')).rejects.toEqual(
      expect.any(ConflictException),
    );
  });

  it('lista apenas o tenant, com busca, filtros, paginação e ordenação', async () => {
    prisma.product.findMany.mockResolvedValue([base]);
    prisma.product.count.mockResolvedValue(1);
    const result = await service.findAll(identity, {
      page: 2,
      limit: 10,
      search: '789',
      status: ProductStatusFilter.ACTIVE,
      categoryId,
      unitId,
      supplierId,
      sortBy: ProductSortField.SALE_PRICE,
      sortOrder: SortOrder.DESC,
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: identity.companyId,
          isActive: true,
          categoryId,
          unitId,
          primarySupplierId: supplierId,
          OR: expect.any(Array),
        }),
        skip: 10,
        take: 10,
        orderBy: { salePrice: 'desc' },
      }),
    );
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 1, totalPages: 1 });
  });

  it('busca produto por id sempre com o tenant autenticado', async () => {
    await service.findOne(identity, productId);
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: productId, companyId: identity.companyId } }),
    );
  });

  it('não revela produto de outro tenant', async () => {
    prisma.product.findFirst.mockResolvedValueOnce(null);
    await expect(service.findOne(identity, productId)).rejects.toEqual(
      expect.any(NotFoundException),
    );
  });

  it('edita campos comerciais e registra antes/depois na auditoria', async () => {
    const updated = { ...base, salePrice: new Prisma.Decimal('25.5') };
    tx.product.update.mockResolvedValueOnce(updated);
    const result = await service.update(
      identity,
      productId,
      { salePrice: '25.50', description: '  Nova descrição  ' },
      'request-update',
    );
    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: productId },
        data: expect.objectContaining({
          salePrice: new Prisma.Decimal('25.50'),
          description: 'Nova descrição',
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'product.updated',
        before: expect.any(Object),
        after: expect.objectContaining({ changedFields: ['salePrice', 'description'] }),
      }),
    });
    expect(result.salePrice).toBe('25.50');
  });

  it('rejeita valor nulo em campo obrigatório durante a edição', async () => {
    await expect(
      service.update(
        identity,
        productId,
        { categoryId: null } as unknown as Parameters<typeof service.update>[2],
        'r',
      ),
    ).rejects.toEqual(expect.any(BadRequestException));
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
  });

  it('mantém relacionamento já associado mesmo se estiver inativo', async () => {
    const inactiveCurrent = {
      ...base,
      category: { ...base.category, isActive: false },
      unit: { ...base.unit, isActive: false },
      primarySupplier: { ...base.primarySupplier, isActive: false },
    };
    prisma.product.findFirst.mockResolvedValueOnce(inactiveCurrent);
    await service.update(
      identity,
      productId,
      { categoryId, unitId, primarySupplierId: supplierId, name: 'Novo nome' },
      'r',
    );
    expect(prisma.category.findFirst).not.toHaveBeenCalled();
    expect(prisma.unitOfMeasure.findFirst).not.toHaveBeenCalled();
    expect(prisma.supplier.findFirst).not.toHaveBeenCalled();
  });

  it('valida somente um relacionamento alterado durante a edição', async () => {
    const nextCategoryId = '30000000-0000-4000-8000-000000000002';
    await service.update(identity, productId, { categoryId: nextCategoryId }, 'r');
    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: nextCategoryId, companyId: identity.companyId },
    });
    expect(prisma.unitOfMeasure.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    [false, 'product.deactivated'],
    [true, 'product.activated'],
  ] as const)('altera status para %s com auditoria', async (isActive, action) => {
    tx.product.update.mockResolvedValueOnce({ ...base, isActive });
    const result = await service.updateStatus(identity, productId, isActive, 'request-status');
    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: productId }, data: { isActive } }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action, before: { isActive: true }, after: { isActive } }),
    });
    expect(result.isActive).toBe(isActive);
  });
});
