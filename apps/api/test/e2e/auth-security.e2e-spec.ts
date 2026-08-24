// Supertest expõe `export =`; o Jest E2E CommonJS não fornece um default em runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTenant } from '../factories/security.factory';
import { login } from '../helpers/auth';
import { resetTestDatabase } from '../helpers/database';
import { createTestApp } from '../helpers/test-app';

describe('Auth and security E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => resetTestDatabase(prisma));
  afterAll(() => app.close());

  it('executa login, me, refresh, rotação, logout e rejeita refresh antigo', async () => {
    const tenant = await createTenant(prisma);
    const session = await login(app, tenant.user.email, tenant.password);
    expect(session.cookie).toEqual(expect.stringContaining('HttpOnly'));
    expect(session.cookie).toEqual(expect.stringContaining('SameSite=Lax'));
    expect(session.cookie).toEqual(expect.stringContaining('Path=/api/v1/auth'));
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.email).toBe(tenant.user.email));
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', session.cookie)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', session.cookie)
      .expect(401);
    const nextCookie = (refreshed.headers['set-cookie'] as unknown as string[])[0];
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', nextCookie)
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', nextCookie)
      .expect(401);
  });

  it.each(['wrong-password', 'missing-user', 'inactive-user', 'inactive-company'])(
    'retorna falha genérica para %s',
    async (scenario) => {
      const tenant = await createTenant(prisma);
      if (scenario === 'inactive-user')
        await prisma.user.update({ where: { id: tenant.user.id }, data: { isActive: false } });
      if (scenario === 'inactive-company')
        await prisma.company.update({
          where: { id: tenant.company.id },
          data: { isActive: false },
        });
      const email = scenario === 'missing-user' ? 'missing@e2e.local' : tenant.user.email;
      const password = scenario === 'wrong-password' ? 'Wrong-password-123!' : tenant.password;
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(401)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            code: 'INVALID_CREDENTIALS',
            message: 'Credenciais inválidas.',
          }),
        );
    },
  );

  it('rejeita ausência, token inválido e token expirado', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    const token = await new JwtService({ secret: process.env.JWT_ACCESS_SECRET }).signAsync(
      { sub: '00000000-0000-4000-8000-000000000000', authVersion: 1 },
      { expiresIn: -1, issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE },
    );
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('diferencia autorização e bloqueia campos extras, paginação e sort inválidos', async () => {
    const tenant = await createTenant(prisma);
    const session = await login(app, tenant.user.email, tenant.password);
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: tenant.user.email, password: tenant.password, companyId: tenant.company.id })
      .expect(400);
    const allowed = await createTenant(prisma, ['products.read']);
    const allowedSession = await login(app, allowed.user.email, allowed.password);
    await request(app.getHttpServer())
      .get('/api/v1/products?limit=1000')
      .set('Authorization', `Bearer ${allowedSession.accessToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/products?sortBy=companyId')
      .set('Authorization', `Bearer ${allowedSession.accessToken}`)
      .expect(400);
  });

  it('retorna correlation e headers de segurança sem identificar tecnologia', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('X-Request-ID', 'e2e-request-1')
      .expect(200);
    expect(response.headers['x-request-id']).toBe('e2e-request-1');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'https://malicious.example')
      .expect(200)
      .expect(({ headers }) => expect(headers['access-control-allow-origin']).toBeUndefined());
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .expect(200)
      .expect('Access-Control-Allow-Origin', 'http://localhost:3000');
    await request(app.getHttpServer()).get('/api/v1/ready').expect(200);
  });

  it('isola listagem, detalhe, relacionamento e analytics entre empresas', async () => {
    const tenantA = await createTenant(prisma, [
      'products.read',
      'products.create',
      'analytics.dashboard.read',
      'finance.read',
    ]);
    const tenantB = await createTenant(prisma);
    const categoryB = await prisma.category.create({
      data: { companyId: tenantB.company.id, name: 'Category B', normalizedName: 'category b' },
    });
    const unitB = await prisma.unitOfMeasure.create({
      data: {
        companyId: tenantB.company.id,
        name: 'Unit B',
        normalizedName: 'unit b',
        symbol: 'UB',
        normalizedSymbol: 'ub',
      },
    });
    const productB = await prisma.product.create({
      data: {
        companyId: tenantB.company.id,
        categoryId: categoryB.id,
        unitId: unitB.id,
        name: 'Secret B',
        sku: 'SECRET-B',
        costPrice: '10',
        salePrice: '20',
      },
    });
    await prisma.financialEntry.create({
      data: {
        companyId: tenantB.company.id,
        number: 'FIN-B',
        type: 'PAYABLE',
        description: 'Secret payable',
        issueDate: new Date('2026-08-01'),
        dueDate: new Date('2026-08-10'),
        originalAmount: '999',
        createdByUserId: tenantB.user.id,
      },
    });
    const session = await login(app, tenantA.user.email, tenantA.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    await request(app.getHttpServer()).get(`/api/v1/products/${productB.id}`).set(auth).expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/products')
      .set(auth)
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(0));
    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set(auth)
      .send({
        name: 'Cross tenant',
        sku: 'CROSS-A',
        categoryId: categoryB.id,
        unitId: unitB.id,
        costPrice: '10.00',
        salePrice: '20.00',
        minimumStock: '0',
      })
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/analytics/dashboard?startDate=2026-08-01&endDate=2026-08-31')
      .set(auth)
      .expect(200)
      .expect(({ body }) => expect(body.sections.finance.totalPayableOpen).toBe('0.00'));
  });

  it('limita a sexta tentativa de login por IP e identificador', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'rate-limit@e2e.local', password: 'Wrong-password-123!' })
        .expect(401);
    }
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'rate-limit@e2e.local', password: 'Wrong-password-123!' })
      .expect(429)
      .expect(({ body }) => expect(body.statusCode).toBe(429));
  });
});
