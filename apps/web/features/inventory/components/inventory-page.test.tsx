import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { InventoryPage } from './inventory-page';

const permissions = new Set<string>();
const balancesMock = vi.fn();
vi.mock('../../../components/navigation/can', () => ({
  usePermission: (permission: string) => permissions.has(permission),
}));
vi.mock('../hooks/use-inventory', () => ({
  useBalances: (...args: unknown[]) => balancesMock(...args),
  useInventoryOptions: () => ({ data: { products: [], locations: [] }, isLoading: false }),
  useProductBalance: () => ({ data: undefined }),
  useCreateEntry: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCreateExit: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCreateAdjustment: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCreateTransfer: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

const emptyQuery = {
  isLoading: false,
  isError: false,
  data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
  refetch: vi.fn(),
};

describe('InventoryPage', () => {
  beforeEach(() => {
    permissions.clear();
    balancesMock.mockReset().mockReturnValue(emptyQuery);
  });

  it('mostra vazio e somente ações autorizadas', () => {
    permissions.add(PERMISSIONS.INVENTORY_ENTRY);
    render(<InventoryPage />);
    expect(screen.getByText('Nenhum saldo encontrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova entrada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova saída' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Histórico' })).not.toBeInTheDocument();
  });

  it('mostra loading e erro com retentativa', () => {
    balancesMock.mockReturnValueOnce({ ...emptyQuery, isLoading: true, data: undefined });
    const { rerender } = render(<InventoryPage />);
    expect(screen.getByTestId('inventory-loading')).toBeInTheDocument();
    balancesMock.mockReturnValueOnce({
      ...emptyQuery,
      isError: true,
      data: undefined,
      error: new Error('falha'),
    });
    rerender(<InventoryPage />);
    expect(screen.getByText('Não foi possível carregar os saldos.')).toBeInTheDocument();
  });

  it('exibe paginação, unidade, mínimo e indicador de estoque baixo', () => {
    balancesMock.mockReturnValue({
      ...emptyQuery,
      data: {
        data: [
          {
            id: 'balance',
            quantity: '3.0000',
            reservedQuantity: '1.0000',
            availableQuantity: '2.0000',
            createdAt: '2026-08-23T12:00:00Z',
            updatedAt: '2026-08-23T12:00:00Z',
            product: {
              id: 'product',
              name: 'Café',
              sku: 'CAF-1',
              minimumStock: '5.000',
              isActive: true,
              unit: { symbol: 'UN' },
            },
            location: {
              id: 'location',
              code: 'A-01',
              isActive: true,
              warehouse: { id: 'warehouse', name: 'Principal', code: 'MAIN', isActive: true },
            },
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });
    render(<InventoryPage />);
    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.getByText('3.0000 UN')).toBeInTheDocument();
    expect(screen.getByText('1.0000 UN')).toBeInTheDocument();
    expect(screen.getByText('2.0000 UN')).toBeInTheDocument();
    expect(screen.getByText('5.000 UN')).toBeInTheDocument();
    expect(screen.getByText('Estoque baixo')).toBeInTheDocument();
  });
});
