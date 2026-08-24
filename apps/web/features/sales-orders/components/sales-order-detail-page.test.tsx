import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { SalesOrderDetailPage } from './sales-order-detail-page';

const permissions: string[] = [];
const detail = vi.fn();
const confirm = vi.fn();
const cancel = vi.fn();
vi.mock('../../auth/hooks/use-auth', () => ({ useAuth: () => ({ user: { permissions } }) }));
vi.mock('../hooks/use-sales-orders', () => ({
  useSalesOrder: (...args: unknown[]) => detail(...args),
  useConfirmSalesOrder: () => ({ mutateAsync: confirm, isPending: false }),
  useCancelSalesOrder: () => ({ mutateAsync: cancel, isPending: false }),
}));

const order = {
  id: 'order-1',
  number: 'SO-000001',
  status: 'DRAFT',
  customer: { id: 'c', name: 'Cliente X', document: '123', creditLimit: '100.00' },
  warehouse: { id: 'w', name: 'Principal', code: 'MAIN' },
  orderDate: '2026-08-23',
  expectedDeliveryDate: null,
  notes: 'Teste',
  subtotal: '10.00',
  discountAmount: '0.00',
  freightAmount: '0.00',
  otherAmount: '0.00',
  totalAmount: '10.00',
  items: [
    {
      id: 'i',
      productId: 'p',
      productName: 'Café',
      productSku: 'CAF-1',
      unitSymbol: 'UN',
      quantity: '1.0000',
      unitPrice: '10.00',
      grossAmount: '10.00',
      discountAmount: '0.00',
      subtotal: '10.00',
      reservedQuantity: '0.0000',
    },
  ],
  createdBy: { id: 'u', name: 'Yuri' },
  confirmedBy: null,
  cancelledBy: null,
  createdAt: '2026-08-23T10:00:00Z',
  updatedAt: '2026-08-23T10:00:00Z',
  confirmedAt: null,
  cancelledAt: null,
  cancellationReason: null,
};

describe('SalesOrderDetailPage', () => {
  beforeEach(() => {
    permissions.splice(0);
    detail
      .mockReset()
      .mockReturnValue({ isLoading: false, isError: false, data: order, refetch: vi.fn() });
    confirm.mockReset().mockResolvedValue({});
    cancel.mockReset().mockResolvedValue({});
  });

  it('exibe snapshots, valores e ações conforme permissões', () => {
    permissions.push(PERMISSIONS.SALES_ORDERS_UPDATE, PERMISSIONS.SALES_ORDERS_CONFIRM);
    render(<SalesOrderDetailPage orderId="order-1" />);
    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.getByText('CAF-1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      '/sales/orders/order-1/edit',
    );
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeInTheDocument();
  });

  it('confirma com aviso explícito de ausência de efeito no estoque', async () => {
    permissions.push(PERMISSIONS.SALES_ORDERS_CONFIRM);
    render(<SalesOrderDetailPage orderId="order-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('não baixa nem reserva o estoque');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(confirm).toHaveBeenCalledWith('order-1');
  });

  it('exige motivo no cancelamento', async () => {
    permissions.push(PERMISSIONS.SALES_ORDERS_CANCEL);
    render(<SalesOrderDetailPage orderId="order-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const action = screen.getByRole('button', { name: 'Confirmar cancelamento' });
    expect(action).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Motivo'), 'Erro comercial');
    await userEvent.click(action);
    expect(cancel).toHaveBeenCalledWith({ id: 'order-1', reason: 'Erro comercial' });
  });

  it('não oferece edição ou confirmação quando confirmado ou cancelado', () => {
    permissions.push(PERMISSIONS.SALES_ORDERS_UPDATE, PERMISSIONS.SALES_ORDERS_CONFIRM);
    detail.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        ...order,
        status: 'CONFIRMED',
        confirmedBy: { id: 'u', name: 'Yuri' },
        confirmedAt: order.createdAt,
      },
      refetch: vi.fn(),
    });
    render(<SalesOrderDetailPage orderId="order-1" />);
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar pedido' })).not.toBeInTheDocument();
  });
});
