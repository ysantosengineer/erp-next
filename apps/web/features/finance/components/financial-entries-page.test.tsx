import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { FinancialEntriesPage } from './financial-entries-page';

const entriesMock = vi.fn();
vi.mock('../hooks/use-finance', () => ({
  useFinancialEntries: (...args: unknown[]) => entriesMock(...args),
  useFinanceSummary: () => ({
    data: {
      totalPayableOpen: '100.00',
      overduePayables: '25.00',
      paidInPeriod: '30.00',
      totalReceivableOpen: '0.00',
      overdueReceivables: '0.00',
      receivedInPeriod: '0.00',
    },
  }),
}));
vi.mock('../../auth/hooks/use-auth', () => ({
  useAuth: () => ({ user: { permissions: [PERMISSIONS.FINANCE_CREATE] } }),
}));

describe('FinancialEntriesPage', () => {
  beforeEach(() =>
    entriesMock.mockReset().mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      refetch: vi.fn(),
    }),
  );
  it('mantém contas a pagar como contexto visual distinto', () => {
    render(<FinancialEntriesPage type="PAYABLE" />);
    expect(screen.getByRole('heading', { name: 'Contas a pagar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Novo título/ })).toHaveAttribute(
      'href',
      '/finance/payables/new',
    );
    expect(entriesMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'PAYABLE' }));
  });
  it('exibe saldo pendente e vencimento derivados pela API', () => {
    entriesMock.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      data: {
        data: [
          {
            id: 'entry',
            number: 'FIN-000001',
            type: 'PAYABLE',
            status: 'OPEN',
            description: 'Aluguel',
            supplier: null,
            customer: null,
            dueDate: '2026-08-01',
            originalAmount: '100.00',
            remainingAmount: '75.00',
            overdue: true,
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });
    render(<FinancialEntriesPage type="PAYABLE" />);
    expect(screen.getByText('R$ 75,00')).toBeInTheDocument();
    expect(screen.getAllByText('Vencido')).toHaveLength(2);
  });
});
