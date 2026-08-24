import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryMovementsPage } from './inventory-movements-page';

const movementsMock = vi.fn();
vi.mock('../hooks/use-inventory', () => ({
  useMovements: (...args: unknown[]) => movementsMock(...args),
  useInventoryOptions: () => ({ data: { products: [], locations: [] } }),
}));

const emptyQuery = {
  isLoading: false,
  isError: false,
  data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
  refetch: vi.fn(),
};

describe('InventoryMovementsPage', () => {
  beforeEach(() => movementsMock.mockReset().mockReturnValue(emptyQuery));

  it('exibe filtros e estado vazio', () => {
    render(<InventoryMovementsPage />);
    expect(screen.getByRole('combobox', { name: 'Filtrar por tipo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Data inicial')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma movimentação encontrada')).toBeInTheDocument();
  });

  it('exibe histórico com origem, destino, responsável e motivo', () => {
    movementsMock.mockReturnValue({
      ...emptyQuery,
      data: {
        data: [
          {
            id: 'movement',
            type: 'TRANSFER',
            quantity: '2.0000',
            reason: 'Reposição',
            referenceType: 'MANUAL',
            referenceId: null,
            createdAt: '2026-08-23T12:00:00Z',
            product: { id: 'product', name: 'Café', sku: 'CAF-1', unit: { symbol: 'UN' } },
            sourceLocation: {
              id: 'source',
              code: 'A-01',
              warehouse: { id: 'w1', name: 'Principal', code: 'MAIN' },
            },
            destinationLocation: {
              id: 'destination',
              code: 'B-01',
              warehouse: { id: 'w2', name: 'Filial', code: 'BRANCH' },
            },
            performedBy: { id: 'user', name: 'Yuri', email: 'yuri@example.com' },
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });
    render(<InventoryMovementsPage />);
    expect(screen.getByText('Transferência')).toBeInTheDocument();
    expect(screen.getByText('MAIN · A-01')).toBeInTheDocument();
    expect(screen.getByText('BRANCH · B-01')).toBeInTheDocument();
    expect(screen.getByText('Yuri')).toBeInTheDocument();
    expect(screen.getByText('Reposição')).toBeInTheDocument();
  });
});
