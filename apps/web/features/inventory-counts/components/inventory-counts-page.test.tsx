import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { InventoryCountsPage } from './inventory-counts-page';

const permissions = new Set<string>();
const countsMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../../components/navigation/can', () => ({
  usePermission: (permission: string) => permissions.has(permission),
}));
vi.mock('../../warehouses/hooks/use-warehouses', () => ({
  useWarehouses: () => ({ data: { data: [] }, isLoading: false }),
}));
vi.mock('../hooks/use-inventory-counts', () => ({
  useInventoryCounts: (...args: unknown[]) => countsMock(...args),
  useCreateInventoryCount: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

const emptyQuery = {
  isLoading: false,
  isError: false,
  data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
  refetch: vi.fn(),
};

describe('InventoryCountsPage', () => {
  beforeEach(() => {
    permissions.clear();
    countsMock.mockReset().mockReturnValue(emptyQuery);
  });

  it('exibe estado vazio e respeita permissão de criação', () => {
    render(<InventoryCountsPage />);
    expect(screen.getByText('Nenhum inventário encontrado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo inventário' })).not.toBeInTheDocument();
    permissions.add(PERMISSIONS.INVENTORY_COUNTS_CREATE);
    const { unmount } = render(<InventoryCountsPage />);
    expect(screen.getByRole('button', { name: 'Novo inventário' })).toBeInTheDocument();
    unmount();
  });

  it('exibe loading e erro', () => {
    countsMock.mockReturnValueOnce({ ...emptyQuery, isLoading: true, data: undefined });
    const { rerender } = render(<InventoryCountsPage />);
    expect(screen.getByTestId('inventory-counts-loading')).toBeInTheDocument();
    countsMock.mockReturnValueOnce({
      ...emptyQuery,
      isError: true,
      data: undefined,
      error: new Error('failure'),
    });
    rerender(<InventoryCountsPage />);
    expect(screen.getByText('Não foi possível carregar os inventários.')).toBeInTheDocument();
  });

  it('renderiza status, progresso, responsável e link do detalhe', () => {
    countsMock.mockReturnValue({
      ...emptyQuery,
      data: {
        data: [
          {
            id: 'count-1',
            status: 'IN_PROGRESS',
            description: null,
            warehouse: { id: 'warehouse', name: 'Principal', code: 'MAIN', isActive: true },
            createdBy: { id: 'user', name: 'Yuri', email: 'yuri@example.test' },
            approvedBy: null,
            cancelledBy: null,
            summary: {
              totalItems: 10,
              countedItems: 4,
              divergentItems: 1,
              recountPendingItems: 1,
              positiveDifferences: 1,
              negativeDifferences: 0,
            },
            startedAt: '2026-08-23T12:00:00Z',
            completedAt: null,
            approvedAt: null,
            cancelledAt: null,
            createdAt: '2026-08-23T12:00:00Z',
            updatedAt: '2026-08-23T12:00:00Z',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });
    render(<InventoryCountsPage />);
    expect(screen.getByText('Em contagem')).toBeInTheDocument();
    expect(screen.getByText('4/10 · 40%')).toBeInTheDocument();
    expect(screen.getByText('Yuri')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      '/inventory/counts/count-1',
    );
  });
});
