// Supertest expõe `export =`; o Jest E2E CommonJS não fornece um default em runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTenant } from '../factories/security.factory';
import { login } from '../helpers/auth';
import { resetTestDatabase } from '../helpers/database';
import { createTestApp } from '../helpers/test-app';

describe('Critical transactions E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => resetTestDatabase(prisma));
  afterAll(() => app.close());

  it('preserva saldo não negativo sob duas saídas concorrentes', async () => {
    const tenant = await createTenant(prisma, [
      'inventory.entry',
      'inventory.exit',
      'inventory.read',
    ]);
    const category = await prisma.category.create({
      data: { companyId: tenant.company.id, name: 'Stock', normalizedName: 'stock' },
    });
    const unit = await prisma.unitOfMeasure.create({
      data: {
        companyId: tenant.company.id,
        name: 'Unit',
        normalizedName: 'unit',
        symbol: 'UN',
        normalizedSymbol: 'un',
      },
    });
    const product = await prisma.product.create({
      data: {
        companyId: tenant.company.id,
        categoryId: category.id,
        unitId: unit.id,
        name: 'Concurrent',
        sku: 'CONCURRENT',
        costPrice: '1',
        salePrice: '2',
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { companyId: tenant.company.id, name: 'Main', code: 'MAIN' },
    });
    const location = await prisma.stockLocation.create({
      data: { companyId: tenant.company.id, warehouseId: warehouse.id, code: 'A1' },
    });
    const session = await login(app, tenant.user.email, tenant.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    await request(app.getHttpServer())
      .post('/api/v1/inventory/movements/entry')
      .set(auth)
      .send({
        productId: product.id,
        destinationLocationId: location.id,
        quantity: '10',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    const results = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/inventory/movements/exit').set(auth).send({
        productId: product.id,
        sourceLocationId: location.id,
        quantity: '8',
        idempotencyKey: randomUUID(),
      }),
      request(app.getHttpServer()).post('/api/v1/inventory/movements/exit').set(auth).send({
        productId: product.id,
        sourceLocationId: location.id,
        quantity: '8',
        idempotencyKey: randomUUID(),
      }),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual([201, 422]);
    const balance = await prisma.inventoryBalance.findFirstOrThrow({
      where: { companyId: tenant.company.id, productId: product.id, locationId: location.id },
    });
    expect(balance.quantity.toFixed(4)).toBe('2.0000');
  });

  it('liquida título parcial e total, bloqueia excesso e preserva idempotência', async () => {
    const tenant = await createTenant(prisma, ['finance.create', 'finance.read', 'finance.settle']);
    const session = await login(app, tenant.user.email, tenant.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    const created = await request(app.getHttpServer())
      .post('/api/v1/finance/entries')
      .set(auth)
      .send({
        type: 'PAYABLE',
        description: 'E2E payable',
        issueDate: '2026-08-01',
        dueDate: '2026-08-20',
        originalAmount: '100.00',
      })
      .expect(201);
    const firstKey = `e2e-${randomUUID()}`;
    const settlement = {
      amount: '40.00',
      settledAt: '2026-08-10',
      paymentMethod: 'PIX',
      idempotencyKey: firstKey,
    };
    await request(app.getHttpServer())
      .post(`/api/v1/finance/entries/${created.body.id}/settlements`)
      .set(auth)
      .send(settlement)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/finance/entries/${created.body.id}/settlements`)
      .set(auth)
      .send(settlement)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/finance/entries/${created.body.id}/settlements`)
      .set(auth)
      .send({ ...settlement, amount: '61.00', idempotencyKey: `e2e-${randomUUID()}` })
      .expect(422);
    const final = await request(app.getHttpServer())
      .post(`/api/v1/finance/entries/${created.body.id}/settlements`)
      .set(auth)
      .send({ ...settlement, amount: '60.00', idempotencyKey: `e2e-${randomUUID()}` })
      .expect(201);
    expect(final.body.entry).toMatchObject({ status: 'SETTLED', remainingAmount: '0.00' });
    expect(
      await prisma.financialSettlement.count({ where: { financialEntryId: created.body.id } }),
    ).toBe(2);
  });
});
