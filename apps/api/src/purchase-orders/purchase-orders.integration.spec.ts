import { PurchaseOrderStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseOrdersService } from './purchase-orders.service';

const describeDb = process.env.RUN_PURCHASE_ORDER_INTEGRATION === 'true' ? describe : describe.skip;
describeDb('PurchaseOrdersService PostgreSQL integration', () => {
  const prisma = new PrismaService();
  const service = new PurchaseOrdersService(prisma);
  const ids = {
    companyId: '',
    userId: '',
    supplierId: '',
    warehouseId: '',
    locationId: '',
    categoryId: '',
    unitId: '',
    productIds: [] as string[],
    otherCompanyId: '',
    otherUserId: '',
    otherSupplierId: '',
    otherWarehouseId: '',
    otherProductId: '',
  };
  let identity: AuthenticatedUser;
  beforeAll(async () => {
    await prisma.$connect();
    const suffix = randomUUID().slice(0, 8);
    const company = await prisma.company.create({ data: { name: `PO ${suffix}` } });
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: 'Buyer',
        email: `buyer-${suffix}@test.local`,
        passwordHash: 'test-only',
      },
    });
    const supplier = await prisma.supplier.create({
      data: {
        companyId: company.id,
        type: 'COMPANY',
        name: 'Supplier',
        document: `99${Date.now()}`,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { companyId: company.id, name: 'Destination', code: `PO-${suffix.toUpperCase()}` },
    });
    const location = await prisma.stockLocation.create({
      data: { companyId: company.id, warehouseId: warehouse.id, code: 'DEFAULT' },
    });
    const category = await prisma.category.create({
      data: { companyId: company.id, name: 'Purchase', normalizedName: `purchase-${suffix}` },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: {
        companyId: company.id,
        name: 'Unit',
        normalizedName: `unit-${suffix}`,
        symbol: `U${suffix}`,
        normalizedSymbol: `U${suffix}`,
      },
    });
    for (let i = 0; i < 2; i++) {
      const product = await prisma.product.create({
        data: {
          companyId: company.id,
          categoryId: category.id,
          unitId: unit.id,
          name: `Product ${i}`,
          sku: `PO-${i}-${suffix}`,
          costPrice: '10.25',
          salePrice: '20',
        },
      });
      ids.productIds.push(product.id);
    }
    await prisma.inventoryBalance.create({
      data: {
        companyId: company.id,
        productId: ids.productIds[0],
        locationId: location.id,
        quantity: '7.0000',
      },
    });
    const other = await prisma.company.create({ data: { name: `Other PO ${suffix}` } });
    const otherUser = await prisma.user.create({
      data: {
        companyId: other.id,
        name: 'Other',
        email: `other-po-${suffix}@test.local`,
        passwordHash: 'test-only',
      },
    });
    const otherSupplier = await prisma.supplier.create({
      data: {
        companyId: other.id,
        type: 'COMPANY',
        name: 'Other supplier',
        document: `88${Date.now()}`,
      },
    });
    const otherWarehouse = await prisma.warehouse.create({
      data: { companyId: other.id, name: 'Other wh', code: `OW-${suffix.toUpperCase()}` },
    });
    const otherCategory = await prisma.category.create({
      data: { companyId: other.id, name: 'Other', normalizedName: `other-${suffix}` },
    });
    const otherUnit = await prisma.unitOfMeasure.create({
      data: {
        companyId: other.id,
        name: 'Other unit',
        normalizedName: `other-unit-${suffix}`,
        symbol: `O${suffix}`,
        normalizedSymbol: `O${suffix}`,
      },
    });
    const otherProduct = await prisma.product.create({
      data: {
        companyId: other.id,
        categoryId: otherCategory.id,
        unitId: otherUnit.id,
        name: 'Other product',
        sku: `OTHER-${suffix}`,
        costPrice: '1',
        salePrice: '2',
      },
    });
    Object.assign(ids, {
      companyId: company.id,
      userId: user.id,
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      locationId: location.id,
      categoryId: category.id,
      unitId: unit.id,
      otherCompanyId: other.id,
      otherUserId: otherUser.id,
      otherSupplierId: otherSupplier.id,
      otherWarehouseId: otherWarehouse.id,
      otherProductId: otherProduct.id,
    });
    identity = {
      userId: user.id,
      companyId: company.id,
      companyName: company.name,
      name: user.name,
      email: user.email,
      authVersion: 1,
      roles: [],
      permissions: [],
    };
  });
  const input = () => ({
    supplierId: ids.supplierId,
    warehouseId: ids.warehouseId,
    expectedDeliveryDate: '2026-09-15',
    notes: 'integration',
    discountAmount: '1',
    freightAmount: '2',
    otherAmount: '0.50',
    items: [
      { productId: ids.productIds[0], quantity: '2.5000', unitCost: '10.25' },
      { productId: ids.productIds[1], quantity: '1', unitCost: '5' },
    ],
  });
  it('calcula, congela snapshots e não altera estoque nem cria movimentação', async () => {
    const beforeBalance = await prisma.inventoryBalance.findFirstOrThrow({
      where: { companyId: ids.companyId, productId: ids.productIds[0] },
    });
    const beforeMovements = await prisma.stockMovement.count({
      where: { companyId: ids.companyId },
    });
    const order = await service.create(identity, input(), randomUUID());
    expect(order.number).toMatch(/^PO-\d{6}$/);
    expect(order.subtotal).toBe('30.63');
    expect(order.totalAmount).toBe('32.13');
    expect(order.items.find((item) => item.productName === 'Product 0')).toMatchObject({
      productName: 'Product 0',
      quantity: '2.5000',
      unitCost: '10.25',
      subtotal: '25.63',
      receivedQuantity: '0.0000',
    });
    await service.submit(identity, order.id, randomUUID());
    const approved = await service.approve(identity, order.id, randomUUID());
    expect(approved.status).toBe(PurchaseOrderStatus.APPROVED);
    expect(
      (
        await prisma.inventoryBalance.findUniqueOrThrow({
          where: {
            companyId_productId_locationId: {
              companyId: ids.companyId,
              productId: ids.productIds[0],
              locationId: ids.locationId,
            },
          },
        })
      ).quantity.toFixed(4),
    ).toBe(beforeBalance.quantity.toFixed(4));
    expect(await prisma.stockMovement.count({ where: { companyId: ids.companyId } })).toBe(
      beforeMovements,
    );
    await expect(
      service.update(identity, order.id, { notes: 'forbidden' }, randomUUID()),
    ).rejects.toMatchObject({ response: { code: 'PURCHASE_ORDER_NOT_EDITABLE' } });
  });
  it('gera números únicos em criações concorrentes', async () => {
    const orders = await Promise.all(
      Array.from({ length: 8 }, () => service.create(identity, input(), randomUUID())),
    );
    expect(new Set(orders.map((order) => order.number)).size).toBe(8);
  });
  it('edita somente DRAFT, substitui itens e recalcula no backend', async () => {
    const order = await service.create(identity, input(), randomUUID());
    const updated = await service.update(
      identity,
      order.id,
      {
        items: [{ productId: ids.productIds[0], quantity: '3.0000', unitCost: '2.25' }],
        discountAmount: '0.25',
        freightAmount: '1',
        otherAmount: '0',
      },
      randomUUID(),
    );
    expect(updated.items).toHaveLength(1);
    expect(updated).toMatchObject({ subtotal: '6.75', totalAmount: '7.50' });
  });
  it('rejeita duplicidade, valores inválidos e relacionamentos inativos', async () => {
    const duplicate = input();
    duplicate.items = [duplicate.items[0], duplicate.items[0]];
    await expect(service.create(identity, duplicate, randomUUID())).rejects.toMatchObject({
      response: { code: 'DUPLICATE_PRODUCT' },
    });
    const zero = input();
    zero.items[0].quantity = '0';
    await expect(service.create(identity, zero, randomUUID())).rejects.toMatchObject({
      response: { code: 'INVALID_QUANTITY' },
    });
    const negative = input();
    negative.items[0].unitCost = '-1';
    await expect(service.create(identity, negative, randomUUID())).rejects.toMatchObject({
      response: { code: 'INVALID_UNIT_COST' },
    });
    const invalidTotal = input();
    invalidTotal.discountAmount = '999';
    await expect(service.create(identity, invalidTotal, randomUUID())).rejects.toMatchObject({
      response: { code: 'INVALID_TOTAL' },
    });
    for (const resource of ['supplier', 'warehouse', 'product'] as const) {
      if (resource === 'supplier')
        await prisma.supplier.update({ where: { id: ids.supplierId }, data: { isActive: false } });
      if (resource === 'warehouse')
        await prisma.warehouse.update({
          where: { id: ids.warehouseId },
          data: { isActive: false },
        });
      if (resource === 'product')
        await prisma.product.update({
          where: { id: ids.productIds[0] },
          data: { isActive: false },
        });
      await expect(service.create(identity, input(), randomUUID())).rejects.toMatchObject({
        response: { code: `${resource.toUpperCase()}_INACTIVE` },
      });
      if (resource === 'supplier')
        await prisma.supplier.update({ where: { id: ids.supplierId }, data: { isActive: true } });
      if (resource === 'warehouse')
        await prisma.warehouse.update({ where: { id: ids.warehouseId }, data: { isActive: true } });
      if (resource === 'product')
        await prisma.product.update({ where: { id: ids.productIds[0] }, data: { isActive: true } });
    }
  });
  it('permite somente um submit simultâneo', async () => {
    const order = await service.create(identity, input(), randomUUID());
    const results = await Promise.allSettled([
      service.submit(identity, order.id, randomUUID()),
      service.submit(identity, order.id, randomUUID()),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await service.findOne(identity, order.id)).status).toBe('PENDING_APPROVAL');
  });
  it('permite uma única aprovação concorrente e mantém estado consistente', async () => {
    const order = await service.create(identity, input(), randomUUID());
    await service.submit(identity, order.id, randomUUID());
    const results = await Promise.allSettled([
      service.approve(identity, order.id, randomUUID()),
      service.approve(identity, order.id, randomUUID()),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await service.findOne(identity, order.id)).status).toBe('APPROVED');
  });
  it.each(['supplier', 'warehouse', 'product'] as const)(
    'bloqueia %s cross-tenant',
    async (kind) => {
      const dto = input();
      if (kind === 'supplier') dto.supplierId = ids.otherSupplierId;
      if (kind === 'warehouse') dto.warehouseId = ids.otherWarehouseId;
      if (kind === 'product') dto.items[0].productId = ids.otherProductId;
      await expect(service.create(identity, dto, randomUUID())).rejects.toMatchObject({
        status: 404,
      });
    },
  );
  it('oculta pedido de outro tenant em leitura, edição, aprovação e cancelamento', async () => {
    const otherIdentity: AuthenticatedUser = {
      ...identity,
      companyId: ids.otherCompanyId,
      userId: ids.otherUserId,
      email: 'other@test.local',
    };
    const otherOrder = await service.create(
      otherIdentity,
      {
        supplierId: ids.otherSupplierId,
        warehouseId: ids.otherWarehouseId,
        discountAmount: '0',
        freightAmount: '0',
        otherAmount: '0',
        items: [{ productId: ids.otherProductId, quantity: '1', unitCost: '1' }],
      },
      randomUUID(),
    );
    await expect(service.findOne(identity, otherOrder.id)).rejects.toMatchObject({ status: 404 });
    await expect(
      service.update(identity, otherOrder.id, { notes: 'x' }, randomUUID()),
    ).rejects.toMatchObject({ status: 404 });
    await expect(service.approve(identity, otherOrder.id, randomUUID())).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      service.cancel(identity, otherOrder.id, 'x tenant', randomUUID()),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('resolve aprovação concorrente com cancelamento em um único estado final', async () => {
    const order = await service.create(identity, input(), randomUUID());
    await service.submit(identity, order.id, randomUUID());
    const results = await Promise.allSettled([
      service.approve(identity, order.id, randomUUID()),
      service.cancel(identity, order.id, 'Concorrência', randomUUID()),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(['APPROVED', 'CANCELLED']).toContain((await service.findOne(identity, order.id)).status);
  });
  it('cancela com motivo e preserva imutabilidade', async () => {
    const order = await service.create(identity, input(), randomUUID());
    const cancelled = await service.cancel(
      identity,
      order.id,
      'Fornecedor indisponível',
      randomUUID(),
    );
    expect(cancelled).toMatchObject({
      status: 'CANCELLED',
      cancellationReason: 'Fornecedor indisponível',
    });
    await expect(service.submit(identity, order.id, randomUUID())).rejects.toMatchObject({
      response: { code: 'PURCHASE_ORDER_CANCELLED' },
    });
  });
  afterAll(async () => {
    for (const companyId of [ids.companyId, ids.otherCompanyId].filter(Boolean)) {
      await prisma.auditLog.deleteMany({ where: { companyId } });
      await prisma.purchaseOrderItem.deleteMany({ where: { companyId } });
      await prisma.purchaseOrder.deleteMany({ where: { companyId } });
      await prisma.purchaseOrderSequence.deleteMany({ where: { companyId } });
      await prisma.inventoryBalance.deleteMany({ where: { companyId } });
      await prisma.stockLocation.deleteMany({ where: { companyId } });
      await prisma.product.deleteMany({ where: { companyId } });
      await prisma.category.deleteMany({ where: { companyId } });
      await prisma.unitOfMeasure.deleteMany({ where: { companyId } });
      await prisma.supplier.deleteMany({ where: { companyId } });
      await prisma.warehouse.deleteMany({ where: { companyId } });
      await prisma.user.deleteMany({ where: { companyId } });
      await prisma.company.delete({ where: { id: companyId } });
    }
    await prisma.$disconnect();
  });
});
