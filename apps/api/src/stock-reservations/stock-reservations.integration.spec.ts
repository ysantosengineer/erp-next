import { StockReservationStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { StockReservationsService } from './stock-reservations.service';

const describeDatabase =
  process.env.RUN_STOCK_RESERVATION_INTEGRATION === 'true' ? describe : describe.skip;

describeDatabase('StockReservationsService PostgreSQL integration', () => {
  const prisma = new PrismaService();
  const inventory = new InventoryService(prisma);
  const reservations = new StockReservationsService(prisma, inventory);
  const sales = new SalesOrdersService(prisma, reservations);
  const ids = {
    companyId: '',
    userId: '',
    customerId: '',
    warehouseId: '',
    locationId: '',
    categoryId: '',
    unitId: '',
  };
  let identity: AuthenticatedUser;
  let productSequence = 0;

  beforeAll(async () => {
    await prisma.$connect();
    const suffix = randomUUID().slice(0, 8);
    const company = await prisma.company.create({ data: { name: `Reservations ${suffix}` } });
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: 'Stock operator',
        email: `stock-${suffix}@test.local`,
        passwordHash: 'test-only',
      },
    });
    const customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        type: 'COMPANY',
        name: 'Customer',
        document: `7${String(Date.now()).slice(-13)}`,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { companyId: company.id, name: 'Main', code: `SR-${suffix.toUpperCase()}` },
    });
    const location = await prisma.stockLocation.create({
      data: { companyId: company.id, warehouseId: warehouse.id, code: 'A-01' },
    });
    const category = await prisma.category.create({
      data: { companyId: company.id, name: 'Stock', normalizedName: `stock-${suffix}` },
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
    Object.assign(ids, {
      companyId: company.id,
      userId: user.id,
      customerId: customer.id,
      warehouseId: warehouse.id,
      locationId: location.id,
      categoryId: category.id,
      unitId: unit.id,
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
        await tx.$executeRawUnsafe("SET LOCAL erp.allow_stock_reservation_mutation = 'on'");
        await tx.auditLog.deleteMany({ where: { companyId: ids.companyId } });
        await tx.stockMovement.deleteMany({ where: { companyId: ids.companyId } });
        await tx.stockReservation.deleteMany({ where: { companyId: ids.companyId } });
        await tx.salesOrderItem.deleteMany({ where: { companyId: ids.companyId } });
        await tx.salesOrder.deleteMany({ where: { companyId: ids.companyId } });
        await tx.salesOrderSequence.deleteMany({ where: { companyId: ids.companyId } });
        await tx.inventoryBalance.deleteMany({ where: { companyId: ids.companyId } });
        await tx.product.deleteMany({ where: { companyId: ids.companyId } });
        await tx.customer.deleteMany({ where: { companyId: ids.companyId } });
        await tx.stockLocation.deleteMany({ where: { companyId: ids.companyId } });
        await tx.warehouse.deleteMany({ where: { companyId: ids.companyId } });
        await tx.category.deleteMany({ where: { companyId: ids.companyId } });
        await tx.unitOfMeasure.deleteMany({ where: { companyId: ids.companyId } });
        await tx.user.deleteMany({ where: { companyId: ids.companyId } });
        await tx.company.delete({ where: { id: ids.companyId } });
      });
    }
    await prisma.$disconnect();
  });

  async function productWithStock(quantity = '10') {
    productSequence += 1;
    const product = await prisma.product.create({
      data: {
        companyId: ids.companyId,
        categoryId: ids.categoryId,
        unitId: ids.unitId,
        name: `Product ${productSequence}`,
        sku: `RES-${productSequence}-${randomUUID().slice(0, 6)}`,
        costPrice: '1',
        salePrice: '2',
      },
    });
    await prisma.inventoryBalance.create({
      data: {
        companyId: ids.companyId,
        productId: product.id,
        locationId: ids.locationId,
        quantity,
      },
    });
    return product;
  }

  async function confirmedOrder(productId: string, quantity: string) {
    const order = await sales.create(
      identity,
      {
        customerId: ids.customerId,
        warehouseId: ids.warehouseId,
        discountAmount: '0',
        freightAmount: '0',
        otherAmount: '0',
        items: [{ productId, quantity, unitPrice: '2', discountAmount: '0' }],
      },
      randomUUID(),
    );
    return sales.confirm(identity, order.id, randomUUID());
  }

  it('reserva integralmente, calcula disponível e protege saídas manuais', async () => {
    const product = await productWithStock();
    const order = await confirmedOrder(product.id, '6');
    const first = await reservations.reserve(identity, order.id, randomUUID());
    const repeated = await reservations.reserve(identity, order.id, randomUUID());
    expect(first.status).toBe('RESERVED');
    expect(repeated.status).toBe('RESERVED');
    expect(
      await prisma.stockReservation.count({
        where: { salesOrderId: order.id, status: StockReservationStatus.ACTIVE },
      }),
    ).toBe(1);
    const balance = await inventory.findProductBalance(identity, product.id);
    expect(balance).toMatchObject({
      totalQuantity: '10.0000',
      totalReservedQuantity: '6.0000',
      totalAvailableQuantity: '4.0000',
    });
    await expect(
      inventory.exit(
        identity,
        { productId: product.id, sourceLocationId: ids.locationId, quantity: '5' },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ response: { code: 'INSUFFICIENT_AVAILABLE_STOCK' } });
    await expect(
      inventory.adjustment(
        identity,
        {
          productId: product.id,
          locationId: ids.locationId,
          quantity: '5',
          direction: 'OUT',
          reason: 'Teste da reserva',
        },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ response: { code: 'INSUFFICIENT_AVAILABLE_STOCK' } });
    const destination = await prisma.stockLocation.create({
      data: {
        companyId: ids.companyId,
        warehouseId: ids.warehouseId,
        code: `B-${productSequence}`,
      },
    });
    await expect(
      inventory.transfer(
        identity,
        {
          productId: product.id,
          sourceLocationId: ids.locationId,
          destinationLocationId: destination.id,
          quantity: '5',
        },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ response: { code: 'INSUFFICIENT_AVAILABLE_STOCK' } });
  });

  it('impede sobrerreserva concorrente e mantém a invariante', async () => {
    const product = await productWithStock();
    const [orderA, orderB] = await Promise.all([
      confirmedOrder(product.id, '8'),
      confirmedOrder(product.id, '8'),
    ]);
    const results = await Promise.allSettled([
      reservations.reserve(identity, orderA.id, randomUUID()),
      reservations.reserve(identity, orderB.id, randomUUID()),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const active = await prisma.stockReservation.aggregate({
      where: {
        companyId: ids.companyId,
        productId: product.id,
        status: StockReservationStatus.ACTIVE,
      },
      _sum: { quantity: true },
    });
    expect(active._sum.quantity?.lte(10)).toBe(true);
  }, 20_000);

  it('libera sem mudar o físico e cancelamento libera reservas', async () => {
    const product = await productWithStock();
    const order = await confirmedOrder(product.id, '6');
    await reservations.reserve(identity, order.id, randomUUID());
    await reservations.release(identity, order.id, randomUUID());
    expect((await inventory.findProductBalance(identity, product.id)).totalAvailableQuantity).toBe(
      '10.0000',
    );
    await reservations.reserve(identity, order.id, randomUUID());
    await sales.cancel(identity, order.id, 'Cliente desistiu', randomUUID());
    expect(
      await prisma.stockReservation.count({
        where: { salesOrderId: order.id, status: StockReservationStatus.ACTIVE },
      }),
    ).toBe(0);
    expect((await inventory.findProductBalance(identity, product.id)).totalQuantity).toBe(
      '10.0000',
    );
  });

  it('expede uma única vez sob concorrência e registra saída referenciada', async () => {
    const product = await productWithStock();
    const order = await confirmedOrder(product.id, '6');
    await reservations.reserve(identity, order.id, randomUUID());
    const results = await Promise.allSettled([
      reservations.ship(identity, order.id, { notes: 'Teste' }, randomUUID()),
      reservations.ship(identity, order.id, { notes: 'Teste' }, randomUUID()),
    ]);
    expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
    expect(await inventory.findProductBalance(identity, product.id)).toMatchObject({
      totalQuantity: '4.0000',
      totalReservedQuantity: '0.0000',
      totalAvailableQuantity: '4.0000',
    });
    expect(
      await prisma.stockMovement.count({
        where: { companyId: ids.companyId, referenceType: 'SALES_ORDER', referenceId: order.id },
      }),
    ).toBe(1);
    expect(
      await prisma.stockReservation.count({
        where: { salesOrderId: order.id, status: StockReservationStatus.CONSUMED },
      }),
    ).toBe(1);
    expect((await sales.findOne(identity, order.id)).status).toBe('SHIPPED');
  }, 20_000);
});
