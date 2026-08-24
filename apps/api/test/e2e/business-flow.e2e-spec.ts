// Supertest expõe `export =`; o Jest E2E CommonJS não fornece um default em runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createBusinessFixture } from '../factories/business.factory';
import { createTenant } from '../factories/security.factory';
import { login } from '../helpers/auth';
import { resetTestDatabase } from '../helpers/database';
import { createTestApp } from '../helpers/test-app';

const businessPermissions = [
  'purchase_orders.read',
  'purchase_orders.create',
  'purchase_orders.submit',
  'purchase_orders.approve',
  'purchase_receipts.read',
  'purchase_receipts.create',
  'sales_orders.read',
  'sales_orders.create',
  'sales_orders.confirm',
  'sales_orders.cancel',
  'inventory.read',
  'inventory.movements.read',
  'inventory.reservations.read',
  'inventory.reserve',
  'inventory.release',
  'inventory.ship',
  'finance.read',
  'finance.create',
  'finance.settle',
  'analytics.dashboard.read',
];

describe('Integrated ERP flow E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => resetTestDatabase(prisma));
  afterAll(() => app.close());

  it('integra compra, recebimento, estoque, venda, reserva, baixa, financeiro e dashboard', async () => {
    const tenant = await createTenant(prisma, businessPermissions);
    const fixture = await createBusinessFixture(prisma, tenant.company.id);
    const session = await login(app, tenant.user.email, tenant.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    const purchase = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set(auth)
      .send({
        supplierId: fixture.supplier.id,
        warehouseId: fixture.warehouse.id,
        items: [{ productId: fixture.product.id, quantity: '10', unitCost: '5.00' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${purchase.body.id}/submit`)
      .set(auth)
      .expect(200);
    const approved = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${purchase.body.id}/approve`)
      .set(auth)
      .expect(200);
    expect(approved.body.status).toBe('APPROVED');
    const purchaseItemId = approved.body.items[0].id as string;

    const firstReceiptKey = randomUUID();
    const firstReceiptBody = {
      purchaseOrderId: purchase.body.id,
      idempotencyKey: firstReceiptKey,
      items: [
        {
          purchaseOrderItemId: purchaseItemId,
          locationId: fixture.location.id,
          receivedQuantity: '4',
        },
      ],
    };
    const firstReceipt = await request(app.getHttpServer())
      .post('/api/v1/purchase-receipts')
      .set(auth)
      .send(firstReceiptBody)
      .expect(201);
    const repeated = await request(app.getHttpServer())
      .post('/api/v1/purchase-receipts')
      .set(auth)
      .send(firstReceiptBody)
      .expect(201);
    expect(repeated.body.id).toBe(firstReceipt.body.id);
    await request(app.getHttpServer())
      .post('/api/v1/purchase-receipts')
      .set(auth)
      .send({
        ...firstReceiptBody,
        idempotencyKey: randomUUID(),
        items: [{ ...firstReceiptBody.items[0], receivedQuantity: '7' }],
      })
      .expect(422);
    await request(app.getHttpServer())
      .post('/api/v1/purchase-receipts')
      .set(auth)
      .send({
        ...firstReceiptBody,
        idempotencyKey: randomUUID(),
        items: [{ ...firstReceiptBody.items[0], receivedQuantity: '6' }],
      })
      .expect(201);
    expect(
      (await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: purchase.body.id } })).status,
    ).toBe('RECEIVED');

    const sale = await request(app.getHttpServer())
      .post('/api/v1/sales-orders')
      .set(auth)
      .send({
        customerId: fixture.customer.id,
        warehouseId: fixture.warehouse.id,
        orderDate: '2026-08-24',
        items: [{ productId: fixture.product.id, quantity: '4', unitPrice: '10.00' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/sales-orders/${sale.body.id}/confirm`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/sales-orders/${sale.body.id}/reserve`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/inventory/products/${fixture.product.id}`)
      .set(auth)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          totalQuantity: '10.0000',
          totalReservedQuantity: '4.0000',
          totalAvailableQuantity: '6.0000',
        }),
      );
    await request(app.getHttpServer())
      .post(`/api/v1/sales-orders/${sale.body.id}/ship`)
      .set(auth)
      .send({ notes: 'E2E shipment' })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('SHIPPED'));

    const cancellableSale = await request(app.getHttpServer())
      .post('/api/v1/sales-orders')
      .set(auth)
      .send({
        customerId: fixture.customer.id,
        warehouseId: fixture.warehouse.id,
        orderDate: '2026-08-24',
        items: [{ productId: fixture.product.id, quantity: '2', unitPrice: '10.00' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/sales-orders/${cancellableSale.body.id}/confirm`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/sales-orders/${cancellableSale.body.id}/reserve`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/sales-orders/${cancellableSale.body.id}/cancel`)
      .set(auth)
      .send({ reason: 'E2E cancellation' })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('CANCELLED'));
    const inventory = await request(app.getHttpServer())
      .get(`/api/v1/inventory/products/${fixture.product.id}`)
      .set(auth)
      .expect(200);
    expect(inventory.body).toMatchObject({
      totalQuantity: '6.0000',
      totalReservedQuantity: '0.0000',
      totalAvailableQuantity: '6.0000',
    });
    expect(
      await prisma.stockReservation.count({
        where: { salesOrderId: cancellableSale.body.id, status: 'RELEASED' },
      }),
    ).toBe(1);
    expect(
      await prisma.stockMovement.count({
        where: { referenceType: 'SALES_ORDER', referenceId: cancellableSale.body.id },
      }),
    ).toBe(0);

    const financial = await request(app.getHttpServer())
      .post('/api/v1/finance/entries')
      .set(auth)
      .send({
        type: 'RECEIVABLE',
        customerId: fixture.customer.id,
        description: 'Integrated sale',
        issueDate: '2026-08-24',
        dueDate: '2026-08-24',
        originalAmount: '40.00',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/finance/entries/${financial.body.id}/settlements`)
      .set(auth)
      .send({
        amount: '40.00',
        settledAt: '2026-08-24',
        paymentMethod: 'PIX',
        idempotencyKey: `e2e-${randomUUID()}`,
      })
      .expect(201);
    const dashboard = await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard?startDate=2026-08-01&endDate=2026-08-31')
      .set(auth)
      .expect(200);
    expect(dashboard.body.sections.sales).not.toBeNull();
    expect(dashboard.body.sections.inventory.productsWithStock).toBe(1);
    expect(dashboard.body.sections.finance.receivedInPeriod).toBe('40.00');
    await request(app.getHttpServer())
      .get('/api/v1/analytics/inventory')
      .set(auth)
      .expect(200)
      .expect(({ body }) => expect(body.data[0].physical).toBe('6.0000'));
  }, 30_000);

  it('rejeita relações cross-tenant em compra, venda, recebimento e financeiro', async () => {
    const tenantA = await createTenant(prisma, businessPermissions);
    const tenantB = await createTenant(prisma);
    const fixtureA = await createBusinessFixture(prisma, tenantA.company.id);
    const fixtureB = await createBusinessFixture(prisma, tenantB.company.id);
    const session = await login(app, tenantA.user.email, tenantA.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set(auth)
      .send({
        supplierId: fixtureB.supplier.id,
        warehouseId: fixtureA.warehouse.id,
        items: [{ productId: fixtureA.product.id, quantity: '1', unitCost: '5.00' }],
      })
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/sales-orders')
      .set(auth)
      .send({
        customerId: fixtureB.customer.id,
        warehouseId: fixtureA.warehouse.id,
        items: [{ productId: fixtureA.product.id, quantity: '1', unitPrice: '10.00' }],
      })
      .expect(404);

    const purchase = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set(auth)
      .send({
        supplierId: fixtureA.supplier.id,
        warehouseId: fixtureA.warehouse.id,
        items: [{ productId: fixtureA.product.id, quantity: '1', unitCost: '5.00' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${purchase.body.id}/submit`)
      .set(auth)
      .expect(200);
    const approved = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${purchase.body.id}/approve`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/purchase-receipts')
      .set(auth)
      .send({
        purchaseOrderId: purchase.body.id,
        idempotencyKey: randomUUID(),
        items: [
          {
            purchaseOrderItemId: approved.body.items[0].id,
            locationId: fixtureB.location.id,
            receivedQuantity: '1',
          },
        ],
      })
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/finance/entries')
      .set(auth)
      .send({
        type: 'PAYABLE',
        supplierId: fixtureB.supplier.id,
        description: 'Cross tenant payable',
        issueDate: '2026-08-24',
        dueDate: '2026-08-24',
        originalAmount: '10.00',
      })
      .expect(404);
  });
});
