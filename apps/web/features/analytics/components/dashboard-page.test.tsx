import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';

vi.mock('../../auth/hooks/use-auth', () => ({
  useAuth: () => ({ user: { name: 'Yuri Santos', company: { name: 'Empresa Teste' } } }),
}));
vi.mock('../hooks/use-analytics', () => ({
  useDashboardAnalytics: () => ({
    isLoading: false,
    isError: false,
    data: {
      period: {
        startDate: '2026-08-01',
        endDate: '2026-08-30',
        previousStartDate: '2026-07-02',
        previousEndDate: '2026-07-31',
        groupBy: 'day',
        timezone: 'UTC',
      },
      generatedAt: '2026-08-24T12:00:00.000Z',
      alerts: [],
      sections: {
        sales: {
          ordersCount: 2,
          grossSalesAmount: '150.00',
          averageOrderValue: '75.00',
          itemsSoldQuantity: [],
          comparison: {
            previousOrdersCount: 0,
            previousGrossSalesAmount: '0.00',
            changePercentage: null,
          },
          statusDistribution: [],
          series: [],
          topProducts: [],
        },
        purchases: null,
        inventory: null,
        finance: null,
      },
    },
  }),
}));

describe('DashboardPage', () => {
  it('exibe dados reais com nomenclatura que não confunde pedidos e faturamento', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { name: 'Olá, Yuri.' })).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
    expect(screen.getByText('Não representa faturamento fiscal')).toBeInTheDocument();
    expect(screen.getByText('Sem base')).toBeInTheDocument();
  });
});
