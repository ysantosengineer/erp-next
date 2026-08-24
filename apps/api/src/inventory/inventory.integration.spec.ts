import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

const describeDatabase =
  process.env.RUN_INVENTORY_INTEGRATION === 'true' ? describe : describe.skip;

describeDatabase('InventoryService PostgreSQL integration', () => {
  const prisma = new PrismaService();
  const service = new InventoryService(prisma);
  const ids = {
    companyId: '',
    userId: '',
    productId: '',
    locationId: '',
    destinationLocationId: '',
    otherCompanyId: '',
    otherTenantLocationId: '',
    balanceId: '',
  };
  let identity: AuthenticatedUser;

  beforeAll(async () => {
    await prisma.$connect();
    const suffix = randomUUID().slice(0, 8);
    const company = await prisma.company.create({ data: { name: `Inventory test ${suffix}` } });
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: 'Inventory test',
        email: `inventory-${suffix}@example.test`,
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
        symbol: `U${suffix}`,
        normalizedSymbol: `U${suffix}`,
      },
    });
    const product = await prisma.product.create({
      data: {
        companyId: company.id,
        categoryId: category.id,
        unitId: unit.id,
        name: `Product ${suffix}`,
        sku: `SKU-${suffix}`,
        costPrice: '1',
        salePrice: '2',
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: {
        companyId: company.id,
        name: `Warehouse ${suffix}`,
        code: `W-${suffix.toUpperCase()}`,
      },
    });
    const location = await prisma.stockLocation.create({
      data: { companyId: company.id, warehouseId: warehouse.id, code: `L-${suffix.toUpperCase()}` },
    });
    const destinationWarehouse = await prisma.warehouse.create({
      data: {
        companyId: company.id,
        name: `Destination ${suffix}`,
        code: `D-${suffix.toUpperCase()}`,
      },
    });
    const destinationLocation = await prisma.stockLocation.create({
      data: {
        companyId: company.id,
        warehouseId: destinationWarehouse.id,
        code: `D-${suffix.toUpperCase()}`,
      },
    });
    const otherCompany = await prisma.company.create({ data: { name: `Other ${suffix}` } });
    const otherWarehouse = await prisma.warehouse.create({
      data: {
        companyId: otherCompany.id,
        name: `Other ${suffix}`,
        code: `O-${suffix.toUpperCase()}`,
      },
    });
    const otherTenantLocation = await prisma.stockLocation.create({
      data: {
        companyId: otherCompany.id,
        warehouseId: otherWarehouse.id,
        code: `O-${suffix.toUpperCase()}`,
      },
    });
    Object.assign(ids, {
      companyId: company.id,
      userId: user.id,
      productId: product.id,
      locationId: location.id,
      destinationLocationId: destinationLocation.id,
      otherCompanyId: otherCompany.id,
      otherTenantLocationId: otherTenantLocation.id,
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

  afterAll(async () => {
    if (ids.companyId) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL erp.allow_stock_movement_mutation = 'on'");
        await tx.auditLog.deleteMany({ where: { companyId: ids.companyId } });
        await tx.stockMovement.deleteMany({ where: { companyId: ids.companyId } });
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
      await prisma.stockLocation.deleteMany({ where: { companyId: ids.otherCompanyId } });
      await prisma.warehouse.deleteMany({ where: { companyId: ids.otherCompanyId } });
      await prisma.company.delete({ where: { id: ids.otherCompanyId } });
    }
    await prisma.$disconnect();
  });

  it('garante idempotência e impede duas saídas concorrentes acima do saldo', async () => {
    const entry = {
      productId: ids.productId,
      destinationLocationId: ids.locationId,
      quantity: '10',
      idempotencyKey: `entry-${ids.companyId}`,
    };
    const first = await service.entry(identity, entry, 'integration-entry');
    const repeated = await service.entry(identity, entry, 'integration-entry-retry');
    expect(repeated.id).toBe(first.id);

    const results = await Promise.allSettled([
      service.exit(
        identity,
        {
          productId: ids.productId,
          sourceLocationId: ids.locationId,
          quantity: '8',
          idempotencyKey: `exit-a-${ids.companyId}`,
        },
        'integration-exit-a',
      ),
      service.exit(
        identity,
        {
          productId: ids.productId,
          sourceLocationId: ids.locationId,
          quantity: '8',
          idempotencyKey: `exit-b-${ids.companyId}`,
        },
        'integration-exit-b',
      ),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        companyId_productId_locationId: {
          companyId: ids.companyId,
          productId: ids.productId,
          locationId: ids.locationId,
        },
      },
    });
    ids.balanceId = balance.id;
    expect(balance.quantity.equals('2')).toBe(true);
    expect(await prisma.stockMovement.count({ where: { companyId: ids.companyId } })).toBe(2);
  }, 20_000);

  it('executa ajustes e transferência entre depósitos com rollback em falha', async () => {
    await service.adjustment(
      identity,
      {
        productId: ids.productId,
        locationId: ids.locationId,
        quantity: '3',
        direction: 'IN',
        reason: 'Ajuste de integração',
      },
      'adjust-in',
    );
    await service.adjustment(
      identity,
      {
        productId: ids.productId,
        locationId: ids.locationId,
        quantity: '1',
        direction: 'OUT',
        reason: 'Ajuste de integração',
      },
      'adjust-out',
    );
    await service.transfer(
      identity,
      {
        productId: ids.productId,
        sourceLocationId: ids.locationId,
        destinationLocationId: ids.destinationLocationId,
        quantity: '3',
      },
      'transfer',
    );

    const balances = await prisma.inventoryBalance.findMany({
      where: { companyId: ids.companyId, productId: ids.productId },
    });
    expect(balances.find((item) => item.locationId === ids.locationId)?.quantity.equals('1')).toBe(
      true,
    );
    expect(
      balances.find((item) => item.locationId === ids.destinationLocationId)?.quantity.equals('3'),
    ).toBe(true);

    await expect(
      service.transfer(
        identity,
        {
          productId: ids.productId,
          sourceLocationId: ids.locationId,
          destinationLocationId: ids.destinationLocationId,
          quantity: '2',
        },
        'insufficient-transfer',
      ),
    ).rejects.toMatchObject({ response: { code: 'INSUFFICIENT_AVAILABLE_STOCK' } });
    await expect(
      service.transfer(
        identity,
        {
          productId: ids.productId,
          sourceLocationId: ids.locationId,
          destinationLocationId: ids.otherTenantLocationId,
          quantity: '1',
        },
        'cross-tenant-transfer',
      ),
    ).rejects.toMatchObject({ response: { code: 'RESOURCE_NOT_FOUND' }, status: 404 });

    const sourceAfterFailures = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        companyId_productId_locationId: {
          companyId: ids.companyId,
          productId: ids.productId,
          locationId: ids.locationId,
        },
      },
    });
    expect(sourceAfterFailures.quantity.equals('1')).toBe(true);
    expect(await prisma.stockMovement.count({ where: { companyId: ids.companyId } })).toBe(5);
    const aggregate = await service.findProductBalance(identity, ids.productId);
    expect(aggregate.totalQuantity).toBe('4.0000');
    expect(aggregate.warehouses).toHaveLength(2);
  });

  it('não expõe saldo a outro tenant e bloqueia mutação do histórico no banco', async () => {
    await expect(
      service.findBalance({ ...identity, companyId: randomUUID() }, ids.balanceId),
    ).rejects.toBeInstanceOf(NotFoundException);
    const movement = await prisma.stockMovement.findFirstOrThrow({
      where: { companyId: ids.companyId },
    });
    await expect(
      prisma.stockMovement.update({
        where: { id: movement.id },
        data: { quantity: new Prisma.Decimal(99) },
      }),
    ).rejects.toThrow('StockMovement is immutable');
  });
});
