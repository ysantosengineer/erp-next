import type { AuthenticatedUser } from '../auth/auth.types';
import { FinanceService } from '../finance/finance.service';
import { FinancialSortField, SortOrder as FinanceSortOrder } from '../finance/dto/finance.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsInventorySortField,
  AnalyticsPurchaseSortField,
  AnalyticsSalesSortField,
  AnalyticsSortOrder,
} from './dto/analytics.dto';

const describeDatabase =
  process.env.RUN_ANALYTICS_INTEGRATION === 'true' ? describe : describe.skip;

describeDatabase('AnalyticsService PostgreSQL integration', () => {
  const prisma = new PrismaService();
  const service = new AnalyticsService(prisma, new FinanceService(prisma));
  let identity: AuthenticatedUser;

  beforeAll(async () => {
    await prisma.$connect();
    const company = await prisma.company.findFirstOrThrow({ select: { id: true, name: true } });
    identity = {
      userId: '00000000-0000-4000-8000-000000000000',
      companyId: company.id,
      companyName: company.name,
      name: 'Analytics integration',
      email: 'analytics-integration@example.local',
      authVersion: 1,
      roles: [],
      permissions: [
        'analytics.dashboard.read',
        'sales_orders.read',
        'purchase_orders.read',
        'inventory.read',
        'inventory.movements.read',
        'finance.read',
      ],
    };
  });

  afterAll(() => prisma.$disconnect());

  it('executa dashboard e quatro relatórios com SQL parametrizado real', async () => {
    const period = { startDate: '2026-01-01', endDate: '2026-08-24' };
    const [dashboard, sales, purchases, inventory, finance] = await Promise.all([
      service.dashboard(identity, period),
      service.salesReport(identity, {
        ...period,
        page: 1,
        limit: 5,
        sortBy: AnalyticsSalesSortField.ORDER_DATE,
        sortOrder: AnalyticsSortOrder.DESC,
      }),
      service.purchasesReport(identity, {
        ...period,
        page: 1,
        limit: 5,
        sortBy: AnalyticsPurchaseSortField.CREATED_AT,
        sortOrder: AnalyticsSortOrder.DESC,
      }),
      service.inventoryReport(identity, {
        ...period,
        page: 1,
        limit: 5,
        sortBy: AnalyticsInventorySortField.PRODUCT_NAME,
        sortOrder: AnalyticsSortOrder.ASC,
      }),
      service.financeReport(identity, {
        page: 1,
        limit: 5,
        sortBy: FinancialSortField.DUE_DATE,
        sortOrder: FinanceSortOrder.ASC,
      }),
    ]);

    expect(Object.values(dashboard.sections).filter(Boolean)).toHaveLength(4);
    expect([
      sales.meta.total,
      purchases.meta.total,
      inventory.meta.total,
      finance.meta.total,
    ]).toEqual(expect.arrayContaining([expect.any(Number)]));
  });
});
