import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseReceiptsService } from './purchase-receipts.service';

const describeDb =
  process.env.RUN_PURCHASE_RECEIPT_INTEGRATION === 'true' ? describe : describe.skip;

describeDb('PurchaseReceiptsService PostgreSQL integration', () => {
  const prisma = new PrismaService();
  const inventory = new InventoryService(prisma);
  const service = new PurchaseReceiptsService(prisma, inventory);
  const ids = {
    companyId: '',
    userId: '',
    supplierId: '',
    warehouseId: '',
    locationId: '',
    inactiveLocationId: '',
    otherWarehouseId: '',
    otherWarehouseLocationId: '',
    categoryId: '',
    unitId: '',
    productIds: [] as string[],
    otherCompanyId: '',
    otherUserId: '',
    otherTenantLocationId: '',
  };
  let identity: AuthenticatedUser;
  let otherIdentity: AuthenticatedUser;

  beforeAll(async () => {
    await prisma.$connect();
    const suffix = randomUUID().slice(0, 8);
    const company = await prisma.company.create({ data: { name: `Receipt ${suffix}` } });
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: 'Receiver',
        email: `receiver-${suffix}@test.local`,
        passwordHash: 'test-only',
      },
    });
    const supplier = await prisma.supplier.create({
      data: {
        companyId: company.id,
        type: 'COMPANY',
        name: 'Committed supplier',
        document: `77${Date.now()}`,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: {
        companyId: company.id,
        name: 'Receipt warehouse',
        code: `PR-${suffix.toUpperCase()}`,
      },
    });
    const location = await prisma.stockLocation.create({
      data: { companyId: company.id, warehouseId: warehouse.id, code: 'RECEIVING' },
    });
    const inactiveLocation = await prisma.stockLocation.create({
      data: {
        companyId: company.id,
        warehouseId: warehouse.id,
        code: 'INACTIVE',
        isActive: false,
      },
    });
    const otherWarehouse = await prisma.warehouse.create({
      data: {
        companyId: company.id,
        name: 'Other warehouse',
        code: `OTHER-${suffix.toUpperCase()}`,
      },
    });
    const otherWarehouseLocation = await prisma.stockLocation.create({
      data: { companyId: company.id, warehouseId: otherWarehouse.id, code: 'OTHER' },
    });
    const category = await prisma.category.create({
      data: { companyId: company.id, name: 'Receipt', normalizedName: `receipt-${suffix}` },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: {
        companyId: company.id,
        name: 'Unit',
        normalizedName: `unit-${suffix}`,
        symbol: `R${suffix}`,
        normalizedSymbol: `R${suffix}`,
      },
    });
    for (let index = 0; index < 2; index += 1) {
      const product = await prisma.product.create({
        data: {
          companyId: company.id,
          categoryId: category.id,
          unitId: unit.id,
          name: `Receipt product ${index}`,
          sku: `PR-${index}-${suffix}`,
          costPrice: '12.50',
          salePrice: '20',
        },
      });
      ids.productIds.push(product.id);
    }
    await prisma.inventoryBalance.create({
      data: {
        companyId: company.id,
        productId: ids.productIds[1],
        locationId: location.id,
        quantity: '5.0000',
      },
    });

    const otherCompany = await prisma.company.create({ data: { name: `Other receipt ${suffix}` } });
    const otherUser = await prisma.user.create({
      data: {
        companyId: otherCompany.id,
        name: 'Other receiver',
        email: `other-receiver-${suffix}@test.local`,
        passwordHash: 'test-only',
      },
    });
    const otherTenantWarehouse = await prisma.warehouse.create({
      data: {
        companyId: otherCompany.id,
        name: 'Other tenant',
        code: `OT-${suffix.toUpperCase()}`,
      },
    });
    const otherTenantLocation = await prisma.stockLocation.create({
      data: {
        companyId: otherCompany.id,
        warehouseId: otherTenantWarehouse.id,
        code: 'OTHER-TENANT',
      },
    });
    Object.assign(ids, {
      companyId: company.id,
      userId: user.id,
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      locationId: location.id,
      inactiveLocationId: inactiveLocation.id,
      otherWarehouseId: otherWarehouse.id,
      otherWarehouseLocationId: otherWarehouseLocation.id,
      categoryId: category.id,
      unitId: unit.id,
      otherCompanyId: otherCompany.id,
      otherUserId: otherUser.id,
      otherTenantLocationId: otherTenantLocation.id,
    });
    identity = authIdentity(company.id, user.id, user.name, user.email);
    otherIdentity = authIdentity(otherCompany.id, otherUser.id, otherUser.name, otherUser.email);
  });

  afterAll(async () => {
    if (ids.companyId) await cleanupCompany(ids.companyId);
    if (ids.otherCompanyId) await cleanupCompany(ids.otherCompanyId);
    await prisma.$disconnect();
  });

  async function cleanupCompany(companyId: string) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL erp.allow_stock_movement_mutation = 'on'");
      await tx.$executeRawUnsafe("SET LOCAL erp.allow_purchase_receipt_mutation = 'on'");
      await tx.auditLog.deleteMany({ where: { companyId } });
      await tx.stockMovement.deleteMany({ where: { companyId } });
      await tx.inventoryBalance.deleteMany({ where: { companyId } });
      await tx.purchaseReceiptItem.deleteMany({ where: { companyId } });
      await tx.purchaseReceipt.deleteMany({ where: { companyId } });
      await tx.purchaseReceiptSequence.deleteMany({ where: { companyId } });
      await tx.inventoryCountItem.deleteMany({ where: { companyId } });
      await tx.inventoryCount.deleteMany({ where: { companyId } });
      await tx.purchaseOrderItem.deleteMany({ where: { companyId } });
      await tx.purchaseOrder.deleteMany({ where: { companyId } });
      await tx.purchaseOrderSequence.deleteMany({ where: { companyId } });
      await tx.product.deleteMany({ where: { companyId } });
      await tx.stockLocation.deleteMany({ where: { companyId } });
      await tx.warehouse.deleteMany({ where: { companyId } });
      await tx.supplier.deleteMany({ where: { companyId } });
      await tx.category.deleteMany({ where: { companyId } });
      await tx.unitOfMeasure.deleteMany({ where: { companyId } });
      await tx.user.deleteMany({ where: { companyId } });
      await tx.company.delete({ where: { id: companyId } });
    });
  }

  async function createApprovedOrder(quantities = ['10', '5']) {
    const number = `PO-TEST-${randomUUID().slice(0, 8)}`;
    const order = await prisma.purchaseOrder.create({
      data: {
        companyId: ids.companyId,
        supplierId: ids.supplierId,
        warehouseId: ids.warehouseId,
        number,
        status: PurchaseOrderStatus.APPROVED,
        subtotal: '187.50',
        totalAmount: '187.50',
        createdByUserId: ids.userId,
        approvedByUserId: ids.userId,
        approvedAt: new Date(),
      },
    });
    await prisma.purchaseOrderItem.createMany({
      data: quantities.map((quantity, index) => ({
        companyId: ids.companyId,
        purchaseOrderId: order.id,
        productId: ids.productIds[index],
        productName: `Receipt product ${index}`,
        productSku: `SNAPSHOT-${index}`,
        unitSymbol: 'UN',
        quantity,
        unitCost: '12.50',
        subtotal: new Prisma.Decimal(quantity).mul('12.50'),
      })),
    });
    return prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
  }

  const payload = (
    order: Awaited<ReturnType<typeof createApprovedOrder>>,
    lines: Array<[number, string, string?]>,
    key = randomUUID(),
  ) => ({
    purchaseOrderId: order.id,
    idempotencyKey: key,
    notes: 'Integration receipt',
    items: lines.map(([itemIndex, quantity, locationId]) => ({
      purchaseOrderItemId: order.items[itemIndex].id,
      locationId: locationId ?? ids.locationId,
      receivedQuantity: quantity,
    })),
  });

  it('processa três recebimentos, atualiza saldos e completa o pedido', async () => {
    const order = await createApprovedOrder();
    const firstKey = randomUUID();
    const firstInput = payload(order, [[0, '4']], firstKey);
    const first = await service.create(identity, firstInput, randomUUID());
    const repeated = await service.create(identity, firstInput, randomUUID());
    expect(repeated.id).toBe(first.id);
    expect(first.number).toMatch(/^PR-\d{6}$/);
    expect(first.items[0]).toMatchObject({
      orderedQuantity: '10.0000',
      previouslyReceivedQuantity: '0.0000',
      receivedQuantity: '4.0000',
      remainingQuantity: '6.0000',
    });
    expect((await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      PurchaseOrderStatus.PARTIALLY_RECEIVED,
    );
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
    ).toBe('4.0000');

    await service.create(
      identity,
      payload(order, [
        [0, '6'],
        [1, '3'],
      ]),
      randomUUID(),
    );
    expect((await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      PurchaseOrderStatus.PARTIALLY_RECEIVED,
    );
    await service.create(identity, payload(order, [[1, '2']]), randomUUID());
    const completed = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    expect(completed.status).toBe(PurchaseOrderStatus.RECEIVED);
    expect(completed.items.map((item) => item.receivedQuantity.toFixed(4))).toEqual([
      '10.0000',
      '5.0000',
    ]);
    const movements = await prisma.stockMovement.findMany({
      where: { companyId: ids.companyId, referenceType: 'PURCHASE_RECEIPT' },
    });
    expect(movements).toHaveLength(4);
    expect(movements.every((movement) => movement.referenceId)).toBe(true);
    const secondBalance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        companyId_productId_locationId: {
          companyId: ids.companyId,
          productId: ids.productIds[1],
          locationId: ids.locationId,
        },
      },
    });
    expect(secondBalance.quantity.toFixed(4)).toBe('10.0000');
    await expect(
      service.create(identity, payload(order, [[0, '1']]), randomUUID()),
    ).rejects.toMatchObject({ response: { code: 'PURCHASE_ORDER_ALREADY_RECEIVED' } });
  });

  it('impede over-receipt concorrente e nunca ultrapassa o pedido', async () => {
    const order = await createApprovedOrder(['10', '5']);
    const results = await Promise.allSettled([
      service.create(identity, payload(order, [[0, '7']]), randomUUID()),
      service.create(identity, payload(order, [[0, '7']]), randomUUID()),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const item = await prisma.purchaseOrderItem.findUniqueOrThrow({
      where: { id: order.items[0].id },
    });
    expect(item.receivedQuantity.toFixed(4)).toBe('7.0000');
    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        companyId_productId_locationId: {
          companyId: ids.companyId,
          productId: ids.productIds[0],
          locationId: ids.locationId,
        },
      },
    });
    expect(balance.quantity.gte(item.receivedQuantity)).toBe(true);
  });

  it('faz rollback integral quando um item falha no meio da operação', async () => {
    const order = await createApprovedOrder();
    let calls = 0;
    const failingInventory = {
      applyPurchaseReceiptEntry: async (
        ...args: Parameters<InventoryService['applyPurchaseReceiptEntry']>
      ) => {
        calls += 1;
        if (calls === 2) throw new Error('forced second item failure');
        return inventory.applyPurchaseReceiptEntry(...args);
      },
    } as InventoryService;
    const failingService = new PurchaseReceiptsService(prisma, failingInventory);
    const beforeMovementCount = await prisma.stockMovement.count({
      where: { companyId: ids.companyId },
    });
    await expect(
      failingService.create(
        identity,
        payload(order, [
          [0, '2'],
          [1, '2'],
        ]),
        randomUUID(),
      ),
    ).rejects.toThrow('forced second item failure');
    expect(await prisma.purchaseReceipt.count({ where: { purchaseOrderId: order.id } })).toBe(0);
    expect(await prisma.stockMovement.count({ where: { companyId: ids.companyId } })).toBe(
      beforeMovementCount,
    );
    const persisted = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(persisted.status).toBe(PurchaseOrderStatus.APPROVED);
    expect(persisted.items.every((item) => item.receivedQuantity.isZero())).toBe(true);
  });

  it('valida chave, localização, tenant, estados e inventário ativo', async () => {
    const order = await createApprovedOrder();
    const key = randomUUID();
    await service.create(identity, payload(order, [[0, '1']], key), randomUUID());
    await expect(
      service.create(identity, payload(order, [[0, '2']], key), randomUUID()),
    ).rejects.toMatchObject({ response: { code: 'RECEIPT_DUPLICATE_REQUEST' } });
    await expect(
      service.create(
        identity,
        payload(order, [[1, '1', ids.otherWarehouseLocationId]]),
        randomUUID(),
      ),
    ).rejects.toMatchObject({ response: { code: 'LOCATION_NOT_ALLOWED' } });
    await expect(
      service.create(identity, payload(order, [[1, '1', ids.otherTenantLocationId]]), randomUUID()),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.create(identity, payload(order, [[1, '1', ids.inactiveLocationId]]), randomUUID()),
    ).rejects.toMatchObject({ response: { code: 'LOCATION_INACTIVE' } });
    await expect(service.getReceivable(otherIdentity, order.id)).rejects.toMatchObject({
      status: 404,
    });

    const inventoryCount = await prisma.inventoryCount.create({
      data: {
        companyId: ids.companyId,
        warehouseId: ids.warehouseId,
        status: 'IN_PROGRESS',
        createdByUserId: ids.userId,
      },
    });
    await expect(
      service.create(identity, payload(order, [[1, '1']]), randomUUID()),
    ).rejects.toMatchObject({ response: { code: 'LOCATION_UNDER_INVENTORY' } });
    await prisma.inventoryCount.update({
      where: { id: inventoryCount.id },
      data: { status: 'CANCELLED' },
    });

    for (const status of [
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderStatus.CANCELLED,
    ]) {
      const blocked = await createApprovedOrder();
      await prisma.purchaseOrder.update({ where: { id: blocked.id }, data: { status } });
      await expect(
        service.create(identity, payload(blocked, [[0, '1']]), randomUUID()),
      ).rejects.toMatchObject({ status: 409 });
    }
  });

  it('permite compromisso aprovado com produto/fornecedor inativos e mantém recibo imutável', async () => {
    const order = await createApprovedOrder();
    await prisma.product.update({ where: { id: ids.productIds[0] }, data: { isActive: false } });
    await prisma.supplier.update({ where: { id: ids.supplierId }, data: { isActive: false } });
    const receipt = await service.create(identity, payload(order, [[0, '1']]), randomUUID());
    expect(receipt.items[0].receivedQuantity).toBe('1.0000');
    await expect(
      prisma.purchaseReceipt.update({ where: { id: receipt.id }, data: { notes: 'forbidden' } }),
    ).rejects.toThrow('PurchaseReceipt is immutable');
    await prisma.product.update({ where: { id: ids.productIds[0] }, data: { isActive: true } });
    await prisma.supplier.update({ where: { id: ids.supplierId }, data: { isActive: true } });
    await expect(service.findOne(otherIdentity, receipt.id)).rejects.toMatchObject({ status: 404 });
  });
});

function authIdentity(
  companyId: string,
  userId: string,
  name: string,
  email: string,
): AuthenticatedUser {
  return {
    userId,
    companyId,
    companyName: 'Integration company',
    name,
    email,
    authVersion: 1,
    roles: [],
    permissions: [],
  };
}
