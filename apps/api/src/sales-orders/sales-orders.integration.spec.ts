import { SalesOrderStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { SalesOrdersService } from './sales-orders.service';

const describeDb = process.env.RUN_SALES_ORDER_INTEGRATION === 'true' ? describe : describe.skip;

describeDb('SalesOrdersService PostgreSQL integration', () => {
  const prisma = new PrismaService();
  const service = new SalesOrdersService(prisma);
  const ids = {
    companyId: '',
    userId: '',
    customerId: '',
    warehouseId: '',
    locationId: '',
    categoryId: '',
    unitId: '',
    productIds: [] as string[],
    otherCompanyId: '',
    otherUserId: '',
    otherCustomerId: '',
    otherWarehouseId: '',
    otherProductId: '',
  };
  let identity: AuthenticatedUser;

  beforeAll(async () => {
    await prisma.$connect();
    const suffix = randomUUID().slice(0, 8);
    const company = await prisma.company.create({ data: { name: `SO ${suffix}` } });
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: 'Seller',
        email: `seller-${suffix}@test.local`,
        passwordHash: 'test-only',
      },
    });
    const customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        type: 'COMPANY',
        name: 'Customer',
        document: `9${String(Date.now()).slice(-13)}`,
        creditLimit: '25.00',
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { companyId: company.id, name: 'Origin', code: `SO-${suffix.toUpperCase()}` },
    });
    const location = await prisma.stockLocation.create({
      data: { companyId: company.id, warehouseId: warehouse.id, code: 'DEFAULT' },
    });
    const category = await prisma.category.create({
      data: { companyId: company.id, name: 'Sales', normalizedName: `sales-${suffix}` },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: {
        companyId: company.id,
        name: 'Unit',
        normalizedName: `sales-unit-${suffix}`,
        symbol: `S${suffix}`,
        normalizedSymbol: `S${suffix}`,
      },
    });
    for (let index = 0; index < 2; index += 1) {
      const product = await prisma.product.create({
        data: {
          companyId: company.id,
          categoryId: category.id,
          unitId: unit.id,
          name: `Sale Product ${index}`,
          sku: `SO-${index}-${suffix}`,
          costPrice: '4.00',
          salePrice: index === 0 ? '10.25' : '5.00',
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

    const other = await prisma.company.create({ data: { name: `Other SO ${suffix}` } });
    const otherUser = await prisma.user.create({
      data: {
        companyId: other.id,
        name: 'Other seller',
        email: `other-seller-${suffix}@test.local`,
        passwordHash: 'test-only',
      },
    });
    const otherCustomer = await prisma.customer.create({
      data: {
        companyId: other.id,
        type: 'COMPANY',
        name: 'Other customer',
        document: `8${String(Date.now()).slice(-13)}`,
      },
    });
    const otherWarehouse = await prisma.warehouse.create({
      data: { companyId: other.id, name: 'Other origin', code: `OS-${suffix.toUpperCase()}` },
    });
    const otherCategory = await prisma.category.create({
      data: { companyId: other.id, name: 'Other', normalizedName: `other-sales-${suffix}` },
    });
    const otherUnit = await prisma.unitOfMeasure.create({
      data: {
        companyId: other.id,
        name: 'Other unit',
        normalizedName: `other-sales-unit-${suffix}`,
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
        sku: `OTHER-SO-${suffix}`,
        costPrice: '1',
        salePrice: '2',
      },
    });
    Object.assign(ids, {
      companyId: company.id,
      userId: user.id,
      customerId: customer.id,
      warehouseId: warehouse.id,
      locationId: location.id,
      categoryId: category.id,
      unitId: unit.id,
      otherCompanyId: other.id,
      otherUserId: otherUser.id,
      otherCustomerId: otherCustomer.id,
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
    customerId: ids.customerId,
    warehouseId: ids.warehouseId,
    orderDate: '2026-08-23',
    expectedDeliveryDate: '2026-09-15',
    notes: 'integration',
    discountAmount: '1',
    freightAmount: '2',
    otherAmount: '0.50',
    items: [
      {
        productId: ids.productIds[0],
        quantity: '2.5000',
        unitPrice: '10.25',
        discountAmount: '0.63',
      },
      {
        productId: ids.productIds[1],
        quantity: '1',
        unitPrice: '5',
        discountAmount: '0',
      },
    ],
  });

  it('cria com snapshots, precisão monetária e reservedQuantity zero', async () => {
    const order = await service.create(identity, input(), randomUUID());
    expect(order.number).toMatch(/^SO-\d{6}$/);
    expect(order).toMatchObject({
      status: SalesOrderStatus.DRAFT,
      subtotal: '30.00',
      discountAmount: '1.00',
      totalAmount: '31.50',
    });
    expect(order.items[0]).toMatchObject({
      productName: 'Sale Product 0',
      quantity: '2.5000',
      unitPrice: '10.25',
      grossAmount: '25.63',
      discountAmount: '0.63',
      subtotal: '25.00',
      reservedQuantity: '0.0000',
    });
  });

  it('gera números únicos sob concorrência', async () => {
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
        items: [
          {
            productId: ids.productIds[0],
            quantity: '3.0000',
            unitPrice: '2.25',
            discountAmount: '0.25',
          },
        ],
        discountAmount: '0.50',
        freightAmount: '1',
        otherAmount: '0',
      },
      randomUUID(),
    );
    expect(updated.items).toHaveLength(1);
    expect(updated).toMatchObject({ subtotal: '6.50', totalAmount: '7.00' });
  });

  it('rejeita produtos duplicados e valores de negócio inválidos', async () => {
    const duplicate = input();
    duplicate.items = [duplicate.items[0], duplicate.items[0]];
    await expect(service.create(identity, duplicate, randomUUID())).rejects.toMatchObject({
      response: { code: 'DUPLICATE_PRODUCT' },
    });
    const invalidQuantity = input();
    invalidQuantity.items[0].quantity = '0';
    await expect(service.create(identity, invalidQuantity, randomUUID())).rejects.toMatchObject({
      response: { code: 'INVALID_QUANTITY' },
    });
    const invalidPrice = input();
    invalidPrice.items[0].unitPrice = '-1';
    await expect(service.create(identity, invalidPrice, randomUUID())).rejects.toMatchObject({
      response: { code: 'INVALID_UNIT_PRICE' },
    });
    const itemDiscount = input();
    itemDiscount.items[0].discountAmount = '999';
    await expect(service.create(identity, itemDiscount, randomUUID())).rejects.toMatchObject({
      response: { code: 'INVALID_DISCOUNT' },
    });
    const generalDiscount = input();
    generalDiscount.discountAmount = '999';
    await expect(service.create(identity, generalDiscount, randomUUID())).rejects.toMatchObject({
      response: { code: 'INVALID_DISCOUNT' },
    });
  });

  it.each(['customer', 'warehouse', 'product'] as const)(
    'rejeita %s inativo na criação',
    async (kind) => {
      if (kind === 'customer') {
        await prisma.customer.update({ where: { id: ids.customerId }, data: { isActive: false } });
      }
      if (kind === 'warehouse') {
        await prisma.warehouse.update({
          where: { id: ids.warehouseId },
          data: { isActive: false },
        });
      }
      if (kind === 'product') {
        await prisma.product.update({
          where: { id: ids.productIds[0] },
          data: { isActive: false },
        });
      }
      await expect(service.create(identity, input(), randomUUID())).rejects.toMatchObject({
        response: { code: `${kind.toUpperCase()}_INACTIVE` },
      });
      if (kind === 'customer') {
        await prisma.customer.update({ where: { id: ids.customerId }, data: { isActive: true } });
      }
      if (kind === 'warehouse') {
        await prisma.warehouse.update({ where: { id: ids.warehouseId }, data: { isActive: true } });
      }
      if (kind === 'product') {
        await prisma.product.update({ where: { id: ids.productIds[0] }, data: { isActive: true } });
      }
    },
  );

  it.each(['customer', 'warehouse', 'product'] as const)(
    'bloqueia %s cross-tenant',
    async (kind) => {
      const dto = input();
      if (kind === 'customer') dto.customerId = ids.otherCustomerId;
      if (kind === 'warehouse') dto.warehouseId = ids.otherWarehouseId;
      if (kind === 'product') dto.items[0].productId = ids.otherProductId;
      await expect(service.create(identity, dto, randomUUID())).rejects.toMatchObject({
        status: 404,
      });
    },
  );

  it('confirma uma única vez e mantém saldo e movimentos inalterados', async () => {
    const order = await service.create(identity, input(), randomUUID());
    const beforeBalance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        companyId_productId_locationId: {
          companyId: ids.companyId,
          productId: ids.productIds[0],
          locationId: ids.locationId,
        },
      },
    });
    const beforeMovements = await prisma.stockMovement.count({
      where: { companyId: ids.companyId },
    });
    const results = await Promise.allSettled([
      service.confirm(identity, order.id, randomUUID()),
      service.confirm(identity, order.id, randomUUID()),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const confirmed = await service.findOne(identity, order.id);
    expect(confirmed.status).toBe(SalesOrderStatus.CONFIRMED);
    expect(confirmed.confirmedBy?.id).toBe(identity.userId);
    expect(confirmed.confirmedAt).not.toBeNull();
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
    ).rejects.toMatchObject({
      response: { code: 'SALES_ORDER_NOT_EDITABLE' },
    });
  });

  it('revalida entidades ativas antes da confirmação', async () => {
    const order = await service.create(identity, input(), randomUUID());
    await prisma.customer.update({ where: { id: ids.customerId }, data: { isActive: false } });
    await expect(service.confirm(identity, order.id, randomUUID())).rejects.toMatchObject({
      response: { code: 'CUSTOMER_INACTIVE' },
    });
    await prisma.customer.update({ where: { id: ids.customerId }, data: { isActive: true } });
  });

  it('permite cancelar DRAFT ou CONFIRMED e preserva imutabilidade', async () => {
    const draft = await service.create(identity, input(), randomUUID());
    const cancelledDraft = await service.cancel(
      identity,
      draft.id,
      'Cliente desistiu',
      randomUUID(),
    );
    expect(cancelledDraft.status).toBe(SalesOrderStatus.CANCELLED);
    await expect(
      service.update(identity, draft.id, { notes: 'x' }, randomUUID()),
    ).rejects.toMatchObject({
      response: { code: 'SALES_ORDER_CANCELLED' },
    });

    const confirmed = await service.create(identity, input(), randomUUID());
    await service.confirm(identity, confirmed.id, randomUUID());
    const cancelledConfirmed = await service.cancel(
      identity,
      confirmed.id,
      'Cancelamento comercial',
      randomUUID(),
    );
    expect(cancelledConfirmed).toMatchObject({
      status: SalesOrderStatus.CANCELLED,
      cancellationReason: 'Cancelamento comercial',
    });
    expect(cancelledConfirmed.confirmedAt).not.toBeNull();
  });

  it('resolve confirmação concorrente com cancelamento em um único estado final', async () => {
    const order = await service.create(identity, input(), randomUUID());
    const results = await Promise.allSettled([
      service.confirm(identity, order.id, randomUUID()),
      service.cancel(identity, order.id, 'Concorrência', randomUUID()),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect([SalesOrderStatus.CONFIRMED, SalesOrderStatus.CANCELLED]).toContain(
      (await service.findOne(identity, order.id)).status,
    );
  });

  it('oculta pedidos de outro tenant em todas as operações', async () => {
    const otherIdentity: AuthenticatedUser = {
      ...identity,
      companyId: ids.otherCompanyId,
      userId: ids.otherUserId,
      email: 'other-sales@test.local',
    };
    const otherOrder = await service.create(
      otherIdentity,
      {
        customerId: ids.otherCustomerId,
        warehouseId: ids.otherWarehouseId,
        discountAmount: '0',
        freightAmount: '0',
        otherAmount: '0',
        items: [
          {
            productId: ids.otherProductId,
            quantity: '1',
            unitPrice: '2',
            discountAmount: '0',
          },
        ],
      },
      randomUUID(),
    );
    await expect(service.findOne(identity, otherOrder.id)).rejects.toMatchObject({ status: 404 });
    await expect(
      service.update(identity, otherOrder.id, { notes: 'x' }, randomUUID()),
    ).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.confirm(identity, otherOrder.id, randomUUID())).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      service.cancel(identity, otherOrder.id, 'x tenant', randomUUID()),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it('registra auditoria sem copiar o pedido inteiro', async () => {
    const order = await service.create(identity, input(), randomUUID());
    await service.update(identity, order.id, { notes: 'audit update' }, randomUUID());
    await service.confirm(identity, order.id, randomUUID());
    await service.cancel(identity, order.id, 'audit cancel', randomUUID());
    const logs = await prisma.auditLog.findMany({
      where: { companyId: ids.companyId, entity: 'SalesOrder', entityId: order.id },
      orderBy: { occurredAt: 'asc' },
    });
    expect(logs.map((log) => log.action)).toEqual([
      'SALES_ORDER_CREATED',
      'SALES_ORDER_UPDATED',
      'SALES_ORDER_CONFIRMED',
      'SALES_ORDER_CANCELLED',
    ]);
    expect(JSON.stringify(logs)).not.toContain('items');
  });

  afterAll(async () => {
    for (const companyId of [ids.companyId, ids.otherCompanyId].filter(Boolean)) {
      await prisma.auditLog.deleteMany({ where: { companyId } });
      await prisma.salesOrderItem.deleteMany({ where: { companyId } });
      await prisma.salesOrder.deleteMany({ where: { companyId } });
      await prisma.salesOrderSequence.deleteMany({ where: { companyId } });
      await prisma.inventoryBalance.deleteMany({ where: { companyId } });
      await prisma.stockLocation.deleteMany({ where: { companyId } });
      await prisma.product.deleteMany({ where: { companyId } });
      await prisma.category.deleteMany({ where: { companyId } });
      await prisma.unitOfMeasure.deleteMany({ where: { companyId } });
      await prisma.customer.deleteMany({ where: { companyId } });
      await prisma.warehouse.deleteMany({ where: { companyId } });
      await prisma.user.deleteMany({ where: { companyId } });
      await prisma.company.delete({ where: { id: companyId } });
    }
    await prisma.$disconnect();
  });
});
