import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { PurchaseOrderDetailPage } from './purchase-order-detail-page';
const permissions: string[] = [];
const detail = vi.fn();
const submit = vi.fn();
const approve = vi.fn();
const cancel = vi.fn();
vi.mock('../../auth/hooks/use-auth', () => ({ useAuth: () => ({ user: { permissions } }) }));
vi.mock('../hooks/use-purchase-orders', () => ({
  usePurchaseOrder: (...args: unknown[]) => detail(...args),
  useSubmitPurchaseOrder: () => ({ mutateAsync: submit }),
  useApprovePurchaseOrder: () => ({ mutateAsync: approve }),
  useCancelPurchaseOrder: () => ({ mutateAsync: cancel, isPending: false }),
}));
const order = {
  id: 'order-1',
  number: 'PO-000001',
  status: 'DRAFT',
  supplier: { id: 's', name: 'Fornecedor X', document: '123' },
  warehouse: { id: 'w', name: 'Principal', code: 'MAIN' },
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
      unitCost: '10.00',
      subtotal: '10.00',
      receivedQuantity: '0.0000',
    },
  ],
  createdBy: { id: 'u', name: 'Yuri' },
  approvedBy: null,
  cancelledBy: null,
  createdAt: '2026-08-23T10:00:00Z',
  updatedAt: '2026-08-23T10:00:00Z',
  approvedAt: null,
  cancelledAt: null,
  cancellationReason: null,
};
describe('PurchaseOrderDetailPage', () => {
  beforeEach(() => {
    permissions.splice(0);
    detail
      .mockReset()
      .mockReturnValue({ isLoading: false, isError: false, data: order, refetch: vi.fn() });
    submit.mockReset().mockResolvedValue({});
    approve.mockReset().mockResolvedValue({});
    cancel.mockReset().mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  it('exibe snapshot, valores e ações conforme permissões', () => {
    permissions.push(PERMISSIONS.PURCHASE_ORDERS_UPDATE, PERMISSIONS.PURCHASE_ORDERS_SUBMIT);
    render(<PurchaseOrderDetailPage orderId="order-1" />);
    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.getByText('CAF-1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
  });
  it('envia e aprova com confirmação', async () => {
    permissions.push(PERMISSIONS.PURCHASE_ORDERS_SUBMIT);
    const { rerender } = render(<PurchaseOrderDetailPage orderId="order-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(submit).toHaveBeenCalledWith('order-1');
    detail.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { ...order, status: 'PENDING_APPROVAL' },
      refetch: vi.fn(),
    });
    permissions.splice(0, 1, PERMISSIONS.PURCHASE_ORDERS_APPROVE);
    rerender(<PurchaseOrderDetailPage orderId="order-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(approve).toHaveBeenCalledWith('order-1');
  });
  it('exige motivo no cancelamento', async () => {
    permissions.push(PERMISSIONS.PURCHASE_ORDERS_CANCEL);
    render(<PurchaseOrderDetailPage orderId="order-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const confirm = screen.getByRole('button', { name: 'Confirmar cancelamento' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Motivo'), 'Erro comercial');
    await userEvent.click(confirm);
    expect(cancel).toHaveBeenCalledWith({ id: 'order-1', reason: 'Erro comercial' });
  });
  it('não oferece edição em aprovado ou cancelado', () => {
    permissions.push(PERMISSIONS.PURCHASE_ORDERS_UPDATE);
    detail.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { ...order, status: 'APPROVED' },
      refetch: vi.fn(),
    });
    render(<PurchaseOrderDetailPage orderId="order-1" />);
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
  });
});
