import { InventoryCountStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryCountsService } from './inventory-counts.service';

const describeDatabase =
  process.env.RUN_INVENTORY_COUNT_INTEGRATION === 'true' ? describe : describe.skip;

describeDatabase('InventoryCountsService PostgreSQL integration', () => {
  const prisma = new PrismaService();
  const inventoryService = new InventoryService(prisma);
  const service = new InventoryCountsService(prisma, inventoryService);
  const ids = {
    companyId: '',
    userId: '',
    warehouseId: '',
    locationId: '',
    otherWarehouseId: '',
    otherLocationId: '',
    otherCompanyId: '',
    otherUserId: '',
    otherTenantWarehouseId: '',
    productIds: [] as string[],
  };
  let identity: AuthenticatedUser;

  beforeAll(async () => {
    await prisma.$connect();
    const suffix = randomUUID().slice(0, 8);
    const company = await prisma.company.create({ data: { name: `Physical inventory ${suffix}` } });
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: 'Inventory counter',
        email: `physical-${suffix}@example.test`,
        passwordHash: 'integration-test-only',
      },
    });
    const category = await prisma.category.create({
      data: {
        companyId: company.id,
        name: `Category ${suffix}`,
        normalizedName: `category ${suffix}`,
      },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: {
        companyId: company.id,
        name: `Unit ${suffix}`,
        normalizedName: `unit ${suffix}`,
        symbol: `I${suffix}`,
        normalizedSymbol: `I${suffix}`,
      },
    });
    for (const [index, quantity] of ['10', '5', '2'].entries()) {
      const product = await prisma.product.create({
        data: {
          companyId: company.id,
          categoryId: category.id,
          unitId: unit.id,
          name: `Product ${index} ${suffix}`,
          sku: `INV-${index}-${suffix}`,
          costPrice: '1',
          salePrice: '2',
        },
      });
      ids.productIds.push(product.id);
      void quantity;
    }
    const warehouse = await prisma.warehouse.create({
      data: { companyId: company.id, name: `Main ${suffix}`, code: `M-${suffix.toUpperCase()}` },
    });
    const location = await prisma.stockLocation.create({
      data: { companyId: company.id, warehouseId: warehouse.id, code: 'COUNT' },
    });
    const otherWarehouse = await prisma.warehouse.create({
      data: { companyId: company.id, name: `Other ${suffix}`, code: `O-${suffix.toUpperCase()}` },
    });
    const otherLocation = await prisma.stockLocation.create({
      data: { companyId: company.id, warehouseId: otherWarehouse.id, code: 'FREE' },
    });
    const otherCompany = await prisma.company.create({ data: { name: `Foreign ${suffix}` } });
    const otherUser = await prisma.user.create({
      data: {
        companyId: otherCompany.id,
        name: 'Foreign user',
        email: `foreign-inventory-${suffix}@example.test`,
        passwordHash: 'integration-test-only',
      },
    });
    const otherTenantWarehouse = await prisma.warehouse.create({
      data: {
        companyId: otherCompany.id,
        name: `Foreign ${suffix}`,
        code: `F-${suffix.toUpperCase()}`,
      },
    });
    Object.assign(ids, {
      companyId: company.id,
      userId: user.id,
      warehouseId: warehouse.id,
      locationId: location.id,
      otherWarehouseId: otherWarehouse.id,
      otherLocationId: otherLocation.id,
      otherCompanyId: otherCompany.id,
      otherUserId: otherUser.id,
      otherTenantWarehouseId: otherTenantWarehouse.id,
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
    for (const [index, quantity] of ['10', '5', '2'].entries()) {
      await inventoryService.entry(
        identity,
        {
          productId: ids.productIds[index]!,
          destinationLocationId: ids.locationId,
          quantity,
        },
        `setup-entry-${index}`,
      );
    }
  });

  afterAll(async () => {
    if (ids.companyId) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL erp.allow_stock_movement_mutation = 'on'");
        await tx.auditLog.deleteMany({ where: { companyId: ids.companyId } });
        await tx.stockMovement.deleteMany({ where: { companyId: ids.companyId } });
        await tx.inventoryCountItem.deleteMany({ where: { companyId: ids.companyId } });
        await tx.inventoryCount.deleteMany({ where: { companyId: ids.companyId } });
        await tx.inventoryBalance.deleteMany({ where: { companyId: ids.companyId } });
        await tx.product.deleteMany({ where: { companyId: ids.companyId } });
        await tx.stockLocation.deleteMany({ where: { companyId: ids.companyId } });
        await tx.warehouse.deleteMany({ where: { companyId: ids.companyId } });
        await tx.category.deleteMany({ where: { companyId: ids.companyId } });
        await tx.unitOfMeasure.deleteMany({ where: { companyId: ids.companyId } });
        await tx.user.deleteMany({ where: { companyId: ids.companyId } });
        await tx.company.delete({ where: { id: ids.companyId } });
      });
    }
    if (ids.otherCompanyId) {
      await prisma.warehouse.deleteMany({ where: { companyId: ids.otherCompanyId } });
      await prisma.user.deleteMany({ where: { companyId: ids.otherCompanyId } });
      await prisma.company.delete({ where: { id: ids.otherCompanyId } });
    }
    await prisma.$disconnect();
  });

  it('executa ciclo completo, bloqueia movimentos e gera apenas ajustes necessários', async () => {
    const created = await service.create(
      identity,
      { warehouseId: ids.warehouseId, description: 'Contagem principal' },
      'create-count',
    );
    expect(created.status).toBe(InventoryCountStatus.DRAFT);
    const started = await service.start(identity, created.id, 'start-count');
    expect(started.status).toBe(InventoryCountStatus.IN_PROGRESS);
    expect(started.summary.totalItems).toBe(3);
    expect(started.items.data.map((item) => item.systemQuantity).sort()).toEqual([
      '10.0000',
      '2.0000',
      '5.0000',
    ]);

    const blockedOperations = [
      inventoryService.entry(
        identity,
        { productId: ids.productIds[0]!, destinationLocationId: ids.locationId, quantity: '1' },
        'blocked-entry',
      ),
      inventoryService.exit(
        identity,
        { productId: ids.productIds[0]!, sourceLocationId: ids.locationId, quantity: '1' },
        'blocked-exit',
      ),
      inventoryService.adjustment(
        identity,
        {
          productId: ids.productIds[0]!,
          locationId: ids.locationId,
          direction: 'IN',
          quantity: '1',
          reason: 'blocked',
        },
        'blocked-adjustment',
      ),
      inventoryService.transfer(
        identity,
        {
          productId: ids.productIds[0]!,
          sourceLocationId: ids.locationId,
          destinationLocationId: ids.otherLocationId,
          quantity: '1',
        },
        'blocked-transfer',
      ),
    ];
    const blocked = await Promise.allSettled(blockedOperations);
    expect(blocked).toHaveLength(4);
    for (const result of blocked) {
      expect(result.status).toBe('rejected');
      if (result.status === 'rejected')
        expect(result.reason).toMatchObject({ response: { code: 'LOCATION_UNDER_INVENTORY' } });
    }
    await expect(
      inventoryService.entry(
        identity,
        {
          productId: ids.productIds[0]!,
          destinationLocationId: ids.otherLocationId,
          quantity: '1',
        },
        'free-warehouse-entry',
      ),
    ).resolves.toMatchObject({ type: 'ENTRY' });

    const targets = new Map([
      [ids.productIds[0]!, '8'],
      [ids.productIds[1]!, '5'],
      [ids.productIds[2]!, '4'],
    ]);
    for (const item of started.items.data) {
      await service.countItem(
        identity,
        created.id,
        item.id,
        { quantity: targets.get(item.product.id)! },
        `count-${item.id}`,
      );
    }
    const recountRequired = await service.requestRecount(identity, created.id, 'request-recount');
    expect(recountRequired.status).toBe(InventoryCountStatus.RECOUNT_REQUIRED);
    expect(recountRequired.summary.divergentItems).toBe(2);
    for (const item of recountRequired.items.data.filter(
      (candidate) => candidate.status === 'RECOUNT_PENDING',
    )) {
      await service.recountItem(
        identity,
        created.id,
        item.id,
        { quantity: item.product.id === ids.productIds[0] ? '7' : '4' },
        `recount-${item.id}`,
      );
    }
    const ready = await service.findOne(identity, created.id);
    expect(ready.status).toBe(InventoryCountStatus.READY_FOR_APPROVAL);
    const approved = await service.approve(identity, created.id, 'approve-count');
    expect(approved.status).toBe(InventoryCountStatus.APPROVED);
    expect(approved.movements).toHaveLength(2);
    expect(approved.movements.map((movement) => movement.type).sort()).toEqual([
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
    ]);
    expect(
      await prisma.stockMovement.count({
        where: { companyId: ids.companyId, referenceType: 'INVENTORY', referenceId: created.id },
      }),
    ).toBe(2);
    const finalBalances = await prisma.inventoryBalance.findMany({
      where: { companyId: ids.companyId, locationId: ids.locationId },
    });
    expect(
      finalBalances.find((item) => item.productId === ids.productIds[0])?.quantity.equals(7),
    ).toBe(true);
    expect(
      finalBalances.find((item) => item.productId === ids.productIds[1])?.quantity.equals(5),
    ).toBe(true);
    expect(
      finalBalances.find((item) => item.productId === ids.productIds[2])?.quantity.equals(4),
    ).toBe(true);
    await expect(service.approve(identity, created.id, 'approve-again')).rejects.toMatchObject({
      response: { code: 'INVENTORY_ALREADY_APPROVED' },
    });
    await expect(
      service.countItem(
        identity,
        created.id,
        approved.items.data[0]!.id,
        { quantity: '1' },
        'edit-approved',
      ),
    ).rejects.toMatchObject({ response: { code: 'INVENTORY_NOT_IN_PROGRESS' } });
    await expect(
      inventoryService.entry(
        identity,
        { productId: ids.productIds[0]!, destinationLocationId: ids.locationId, quantity: '1' },
        'released-after-approval',
      ),
    ).resolves.toMatchObject({ type: 'ENTRY' });
  }, 30_000);

  it('cancela sem ajustes, preserva histórico e libera o depósito', async () => {
    const created = await service.create(
      identity,
      { warehouseId: ids.warehouseId },
      'cancel-create',
    );
    await service.start(identity, created.id, 'cancel-start');
    const before = await prisma.stockMovement.count({ where: { companyId: ids.companyId } });
    const cancelled = await service.cancel(identity, created.id, 'cancel-count');
    expect(cancelled.status).toBe(InventoryCountStatus.CANCELLED);
    expect(cancelled.summary.totalItems).toBe(3);
    expect(await prisma.stockMovement.count({ where: { companyId: ids.companyId } })).toBe(before);
    await expect(
      inventoryService.entry(
        identity,
        { productId: ids.productIds[1]!, destinationLocationId: ids.locationId, quantity: '1' },
        'released-after-cancel',
      ),
    ).resolves.toMatchObject({ type: 'ENTRY' });
  });

  it('faz rollback integral quando um ajuste intermediário falha', async () => {
    const created = await service.create(
      identity,
      { warehouseId: ids.warehouseId },
      'rollback-create',
    );
    await service.start(identity, created.id, 'rollback-start');
    const items = await prisma.inventoryCountItem.findMany({
      where: { inventoryCountId: created.id, companyId: ids.companyId },
      orderBy: { id: 'asc' },
    });
    expect(items.length).toBeGreaterThanOrEqual(2);
    const first = items[0]!;
    const second = items[1]!;
    const firstFinal = first.systemQuantity.plus(1);
    const secondFinal = second.systemQuantity.minus(1);
    for (const item of items) {
      const quantity =
        item.id === first.id
          ? firstFinal
          : item.id === second.id
            ? secondFinal
            : item.systemQuantity;
      await service.countItem(
        identity,
        created.id,
        item.id,
        { quantity: quantity.toFixed(4) },
        `rollback-count-${item.id}`,
      );
    }
    await service.requestRecount(identity, created.id, 'rollback-request');
    for (const item of [first, second]) {
      const quantity = item.id === first.id ? firstFinal : secondFinal;
      await service.recountItem(
        identity,
        created.id,
        item.id,
        { quantity: quantity.toFixed(4) },
        `rollback-recount-${item.id}`,
      );
    }
    const firstBefore = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        companyId_productId_locationId: {
          companyId: ids.companyId,
          productId: first.productId,
          locationId: first.locationId,
        },
      },
    });
    await prisma.inventoryBalance.update({
      where: {
        companyId_productId_locationId: {
          companyId: ids.companyId,
          productId: second.productId,
          locationId: second.locationId,
        },
      },
      data: { quantity: 0 },
    });
    await expect(service.approve(identity, created.id, 'rollback-approve')).rejects.toMatchObject({
      response: { code: 'INSUFFICIENT_AVAILABLE_STOCK' },
    });
    const firstAfter = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        companyId_productId_locationId: {
          companyId: ids.companyId,
          productId: first.productId,
          locationId: first.locationId,
        },
      },
    });
    expect(firstAfter.quantity.equals(firstBefore.quantity)).toBe(true);
    expect(
      await prisma.stockMovement.count({
        where: { companyId: ids.companyId, referenceType: 'INVENTORY', referenceId: created.id },
      }),
    ).toBe(0);
    expect(
      (await prisma.inventoryCount.findUniqueOrThrow({ where: { id: created.id } })).status,
    ).toBe(InventoryCountStatus.READY_FOR_APPROVAL);
    await prisma.inventoryBalance.update({
      where: {
        companyId_productId_locationId: {
          companyId: ids.companyId,
          productId: second.productId,
          locationId: second.locationId,
        },
      },
      data: { quantity: second.systemQuantity },
    });
    await service.cancel(identity, created.id, 'rollback-cancel');
  }, 30_000);

  it('serializa duas aprovações e bloqueia acesso cross-tenant', async () => {
    const created = await service.create(
      identity,
      { warehouseId: ids.warehouseId },
      'concurrent-create',
    );
    const started = await service.start(identity, created.id, 'concurrent-start');
    const divergent = started.items.data[0]!;
    for (const item of started.items.data) {
      const quantity =
        item.id === divergent.id
          ? new Prisma.Decimal(item.systemQuantity).plus(1).toFixed(4)
          : item.systemQuantity;
      await service.countItem(
        identity,
        created.id,
        item.id,
        { quantity },
        `concurrent-count-${item.id}`,
      );
    }
    await service.requestRecount(identity, created.id, 'concurrent-request');
    await service.recountItem(
      identity,
      created.id,
      divergent.id,
      { quantity: new Prisma.Decimal(divergent.systemQuantity).plus(1).toFixed(4) },
      'concurrent-recount',
    );
    const approvals = await Promise.allSettled([
      service.approve(identity, created.id, 'concurrent-a'),
      service.approve(identity, created.id, 'concurrent-b'),
    ]);
    expect(approvals.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(approvals.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(
      await prisma.stockMovement.count({
        where: { companyId: ids.companyId, referenceType: 'INVENTORY', referenceId: created.id },
      }),
    ).toBe(1);

    const foreignIdentity = { ...identity, companyId: ids.otherCompanyId, userId: ids.otherUserId };
    await expect(service.findOne(foreignIdentity, created.id)).rejects.toMatchObject({
      response: { code: 'INVENTORY_COUNT_NOT_FOUND' },
    });
    await expect(
      service.create(identity, { warehouseId: ids.otherTenantWarehouseId }, 'cross-tenant-create'),
    ).rejects.toMatchObject({ response: { code: 'WAREHOUSE_NOT_FOUND' } });
  }, 30_000);
});
