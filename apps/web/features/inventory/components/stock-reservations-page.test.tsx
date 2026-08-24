import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StockReservationsPage } from './stock-reservations-page';

const reservationsMock = vi.fn();
vi.mock('../hooks/use-inventory', () => ({
  useStockReservations: (...args: unknown[]) => reservationsMock(...args),
  useInventoryOptions: () => ({ data: { products: [], locations: [] } }),
}));

const emptyQuery = {
  isLoading: false,
  isError: false,
  data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
  refetch: vi.fn(),
};

describe('StockReservationsPage', () => {
  beforeEach(() => reservationsMock.mockReset().mockReturnValue(emptyQuery));

  it('inicia filtrando reservas ativas e exibe os filtros', () => {
    render(<StockReservationsPage />);
    expect(screen.getByRole('combobox', { name: 'Filtrar por status' })).toHaveTextContent(
      'Ativas',
    );
    expect(screen.getByLabelText('Data inicial')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma reserva encontrada')).toBeInTheDocument();
    expect(reservationsMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' }));
  });

  it('exibe alocação e link para o pedido', () => {
    reservationsMock.mockReturnValue({
      ...emptyQuery,
      data: {
        data: [
          {
            id: 'reservation',
            status: 'ACTIVE',
            quantity: '2.0000',
            createdAt: '2026-08-24T12:00:00Z',
            salesOrder: { id: 'order', number: 'SO-000001', status: 'RESERVED' },
            salesOrderItemId: 'item',
            product: { id: 'product', name: 'Café', sku: 'CAF-1', unitSymbol: 'UN' },
            location: {
              id: 'location',
              code: 'A-01',
              warehouse: { id: 'warehouse', code: 'MAIN', name: 'Principal' },
            },
            createdBy: { id: 'user', name: 'Yuri' },
            releasedBy: null,
            consumedBy: null,
            releasedAt: null,
            consumedAt: null,
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });
    render(<StockReservationsPage />);
    expect(screen.getByText('SO-000001')).toBeInTheDocument();
    expect(screen.getByText('2,0000 UN')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      '/sales/orders/order',
    );
  });
});
