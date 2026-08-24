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

describe('Inventory flows E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => resetTestDatabase(prisma));
  afterAll(() => app.close());

  it('executa entrada, saída, ajuste e transferência preservando saldos e autoria', async () => {
    const tenant = await createTenant(prisma, [
      'inventory.read',
      'inventory.movements.read',
      'inventory.entry',
      'inventory.exit',
      'inventory.adjust',
      'inventory.transfer',
    ]);
    const fixture = await createBusinessFixture(prisma, tenant.company.id);
    const session = await login(app, tenant.user.email, tenant.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    await request(app.getHttpServer())
      .post('/api/v1/inventory/movements/entry')
      .set(auth)
      .send({
        productId: fixture.product.id,
        destinationLocationId: fixture.location.id,
        quantity: '10',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/inventory/movements/exit')
      .set(auth)
      .send({
        productId: fixture.product.id,
        sourceLocationId: fixture.location.id,
        quantity: '2',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/inventory/movements/adjustment')
      .set(auth)
      .send({
        productId: fixture.product.id,
        locationId: fixture.location.id,
        direction: 'OUT',
        quantity: '1',
        reason: 'E2E adjustment',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/inventory/movements/transfer')
      .set(auth)
      .send({
        productId: fixture.product.id,
        sourceLocationId: fixture.location.id,
        destinationLocationId: fixture.destinationLocation.id,
        quantity: '3',
        idempotencyKey: randomUUID(),
      })
      .expect(201);

    const balance = await request(app.getHttpServer())
      .get(`/api/v1/inventory/products/${fixture.product.id}`)
      .set(auth)
      .expect(200);
    expect(balance.body).toMatchObject({
      totalQuantity: '7.0000',
      totalReservedQuantity: '0.0000',
      totalAvailableQuantity: '7.0000',
    });
    const stored = await prisma.inventoryBalance.findMany({
      where: { companyId: tenant.company.id, productId: fixture.product.id },
      orderBy: { quantity: 'asc' },
    });
    expect(stored.map((item) => item.quantity.toFixed(4))).toEqual(['3.0000', '4.0000']);
    expect(
      await prisma.stockMovement.count({
        where: { companyId: tenant.company.id, performedByUserId: tenant.user.id },
      }),
    ).toBeGreaterThanOrEqual(4);
  });

  it('executa inventário com divergência, recontagem, aprovação e imutabilidade', async () => {
    const tenant = await createTenant(prisma, [
      'inventory.entry',
      'inventory_counts.read',
      'inventory_counts.create',
      'inventory_counts.count',
      'inventory_counts.recount',
      'inventory_counts.approve',
      'inventory_counts.cancel',
    ]);
    const fixture = await createBusinessFixture(prisma, tenant.company.id);
    const session = await login(app, tenant.user.email, tenant.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    await request(app.getHttpServer())
      .post('/api/v1/inventory/movements/entry')
      .set(auth)
      .send({
        productId: fixture.product.id,
        destinationLocationId: fixture.location.id,
        quantity: '10',
      })
      .expect(201);
    const created = await request(app.getHttpServer())
      .post('/api/v1/inventory/counts')
      .set(auth)
      .send({ warehouseId: fixture.warehouse.id, description: 'E2E count' })
      .expect(201);
    const started = await request(app.getHttpServer())
      .post(`/api/v1/inventory/counts/${created.body.id}/start`)
      .set(auth)
      .expect(200);
    const itemId = started.body.items.data[0].id as string;
    await request(app.getHttpServer())
      .put(`/api/v1/inventory/counts/${created.body.id}/items/${itemId}/count`)
      .set(auth)
      .send({ quantity: '8' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/inventory/counts/${created.body.id}/recount`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/inventory/counts/${created.body.id}/items/${itemId}/recount`)
      .set(auth)
      .send({ quantity: '8' })
      .expect(200);
    const approved = await request(app.getHttpServer())
      .post(`/api/v1/inventory/counts/${created.body.id}/approve`)
      .set(auth)
      .expect(200);
    expect(approved.body).toMatchObject({ status: 'APPROVED' });
    expect(approved.body.movements).toHaveLength(1);
    await request(app.getHttpServer())
      .post(`/api/v1/inventory/counts/${created.body.id}/approve`)
      .set(auth)
      .expect(409);
    const finalBalance = await prisma.inventoryBalance.findFirstOrThrow({
      where: { companyId: tenant.company.id, productId: fixture.product.id },
    });
    expect(finalBalance.quantity.toFixed(4)).toBe('8.0000');
  });
});
