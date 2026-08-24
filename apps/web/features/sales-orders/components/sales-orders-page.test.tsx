import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { SalesOrdersPage } from './sales-orders-page';

const permissions: string[] = [];
const list = vi.fn();
vi.mock('../../auth/hooks/use-auth', () => ({ useAuth: () => ({ user: { permissions } }) }));
vi.mock('../hooks/use-sales-orders', () => ({
  useSalesOrders: (...args: unknown[]) => list(...args),
  useSalesOrderOptions: () => ({ data: { customers: [], warehouses: [], products: [] } }),
}));

const empty = {
  isLoading: false,
  isError: false,
  data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
  refetch: vi.fn(),
};

describe('SalesOrdersPage', () => {
  beforeEach(() => {
    permissions.splice(0);
    list.mockReset().mockReturnValue(empty);
  });

  it('exibe filtros, estado vazio e controla criação por permissão', () => {
    const view = render(<SalesOrdersPage />);
    expect(screen.getByText('Nenhum pedido encontrado')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Novo pedido' })).not.toBeInTheDocument();
    permissions.push(PERMISSIONS.SALES_ORDERS_CREATE);
    view.rerender(<SalesOrdersPage />);
    expect(screen.getByRole('link', { name: 'Novo pedido' })).toHaveAttribute(
      'href',
      '/sales/orders/new',
    );
    expect(screen.getByRole('textbox', { name: 'Pesquisar pedidos' })).toBeInTheDocument();
  });

  it('renderiza pedido, cliente, total, status e detalhe', () => {
    list.mockReturnValue({
      ...empty,
      data: {
        data: [
          {
            id: 'order-1',
            number: 'SO-000123',
            status: 'CONFIRMED',
            customer: { name: 'Cliente' },
            warehouse: { name: 'Principal' },
            orderDate: '2026-08-23',
            expectedDeliveryDate: null,
            totalAmount: '8500.00',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });
    render(<SalesOrdersPage />);
    expect(screen.getByText('SO-000123')).toBeInTheDocument();
    expect(screen.getAllByText('Cliente')).toHaveLength(2);
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    expect(screen.getByText('R$ 8.500,00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Detalhes' })).toHaveAttribute(
      'href',
      '/sales/orders/order-1',
    );
  });

  it('renderiza loading e erro', () => {
    list.mockReturnValueOnce({ ...empty, isLoading: true, data: undefined });
    const { rerender } = render(<SalesOrdersPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    list.mockReturnValueOnce({ ...empty, isError: true, data: undefined });
    rerender(<SalesOrdersPage />);
    expect(screen.getByText('Não foi possível carregar os pedidos.')).toBeInTheDocument();
  });
});
