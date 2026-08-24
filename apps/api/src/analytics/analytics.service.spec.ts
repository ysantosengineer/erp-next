import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { FinanceService } from '../finance/finance.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

const identity: AuthenticatedUser = {
  userId: '11111111-1111-4111-8111-111111111111',
  companyId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Empresa Teste',
  name: 'Gestor Teste',
  email: 'manager@erp.local',
  authVersion: 1,
  permissions: ['analytics.dashboard.read'],
  roles: [],
};

describe('AnalyticsService', () => {
  const prisma = { $queryRaw: jest.fn(), stockMovement: { findMany: jest.fn() } };
  const finance = { summary: jest.fn(), findAll: jest.fn() };
  const service = new AnalyticsService(
    prisma as unknown as PrismaService,
    finance as unknown as FinanceService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('usa 30 dias por padrão e não expõe seções sem permissão de domínio', async () => {
    const result = await service.dashboard(identity, {});
    const start = new Date(`${result.period.startDate}T00:00:00.000Z`);
    const end = new Date(`${result.period.endDate}T00:00:00.000Z`);
    expect(Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1).toBe(30);
    expect(result.sections).toEqual({
      sales: null,
      purchases: null,
      inventory: null,
      finance: null,
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(finance.summary).not.toHaveBeenCalled();
  });

  it('rejeita intervalo invertido e período superior a 366 dias', async () => {
    await expect(
      service.dashboard(identity, { startDate: '2026-08-20', endDate: '2026-08-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.dashboard(identity, { startDate: '2025-01-01', endDate: '2026-08-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('parametriza o tenant na consulta de estoque', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        productsCount: 1n,
        productsWithStock: 1n,
        productsWithoutStock: 0n,
        lowStockProducts: 0n,
        activeReservations: 0n,
        reservedOrders: 0n,
      },
    ]);
    await service.dashboard(
      { ...identity, permissions: ['analytics.dashboard.read', 'inventory.read'] },
      { startDate: '2026-08-01', endDate: '2026-08-30' },
    );
    const sql = prisma.$queryRaw.mock.calls[0]?.[0] as { values: unknown[] };
    expect(sql.values).toContain(identity.companyId);
  });
});
