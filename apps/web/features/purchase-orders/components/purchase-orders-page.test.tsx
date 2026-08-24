import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { PurchaseOrdersPage } from './purchase-orders-page';
const permissions: string[] = [];
const list = vi.fn();
vi.mock('../../auth/hooks/use-auth', () => ({ useAuth: () => ({ user: { permissions } }) }));
vi.mock('../hooks/use-purchase-orders', () => ({
  usePurchaseOrders: (...args: unknown[]) => list(...args),
  usePurchaseOrderOptions: () => ({ data: { suppliers: [], warehouses: [], products: [] } }),
}));
const empty = {
  isLoading: false,
  isError: false,
  data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
  refetch: vi.fn(),
};
describe('PurchaseOrdersPage', () => {
  beforeEach(() => {
    permissions.splice(0);
    list.mockReset().mockReturnValue(empty);
  });
  it('exibe filtros, vazio e controla criação por permissão', () => {
    const view = render(<PurchaseOrdersPage />);
    expect(screen.getByText('Nenhum pedido encontrado')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Novo pedido' })).not.toBeInTheDocument();
    permissions.push(PERMISSIONS.PURCHASE_ORDERS_CREATE);
    view.rerender(<PurchaseOrdersPage />);
    expect(screen.getByRole('link', { name: 'Novo pedido' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Pesquisar pedidos' })).toBeInTheDocument();
  });
  it('renderiza pedido, total, status e detalhe', () => {
    list.mockReturnValue({
      ...empty,
      data: {
        data: [
          {
            id: 'order-1',
            number: 'PO-000123',
            status: 'PENDING_APPROVAL',
            supplier: { name: 'Fornecedor' },
            warehouse: { name: 'Principal' },
            createdAt: '2026-08-23T10:00:00Z',
            expectedDeliveryDate: null,
            totalAmount: '8500.00',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });
    render(<PurchaseOrdersPage />);
    expect(screen.getByText('PO-000123')).toBeInTheDocument();
    expect(screen.getByText('Aguardando aprovação')).toBeInTheDocument();
    expect(screen.getByText('R$ 8.500,00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Detalhes' })).toHaveAttribute(
      'href',
      '/purchases/orders/order-1',
    );
  });
  it('renderiza loading e erro', () => {
    list.mockReturnValueOnce({ ...empty, isLoading: true, data: undefined });
    const { rerender } = render(<PurchaseOrdersPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    list.mockReturnValueOnce({ ...empty, isError: true, data: undefined });
    rerender(<PurchaseOrdersPage />);
    expect(screen.getByText('Não foi possível carregar os pedidos.')).toBeInTheDocument();
  });
});
