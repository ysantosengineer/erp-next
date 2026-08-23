import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseReceiptDetailPage } from './purchase-receipt-detail-page';

const detail = vi.fn();
vi.mock('../hooks/use-purchase-receipts', () => ({
  usePurchaseReceipt: (...args: unknown[]) => detail(...args),
}));

const receipt = {
  id: 'receipt-1',
  number: 'PR-000001',
  purchaseOrder: { id: 'order-1', number: 'PO-000001', status: 'PARTIALLY_RECEIVED' },
  supplier: { id: 'supplier', name: 'Fornecedor' },
  warehouse: { id: 'warehouse', name: 'Principal', code: 'MAIN' },
  receivedAt: '2026-08-23T10:00:00Z',
  notes: 'Caixa avariada',
  receivedBy: { id: 'user', name: 'Yuri' },
  itemCount: 1,
  totalQuantity: '4.0000',
  createdAt: '2026-08-23T10:00:00Z',
  items: [
    {
      id: 'item',
      purchaseOrderItemId: 'order-item',
      product: { id: 'product', name: 'Café', sku: 'CAF-1', unitSymbol: 'UN' },
      location: { id: 'location', name: 'A-01', code: 'A-01' },
      orderedQuantity: '10.0000',
      previouslyReceivedQuantity: '0.0000',
      receivedQuantity: '4.0000',
      remainingQuantity: '6.0000',
      unitCost: '12.50',
      discrepancyReason: 'Embalagem danificada',
    },
  ],
};

describe('PurchaseReceiptDetailPage', () => {
  beforeEach(() => {
    detail.mockReset().mockReturnValue({
      isLoading: false,
      isError: false,
      data: receipt,
      refetch: vi.fn(),
    });
  });

  it('exibe rastreabilidade, quantidades e localização', () => {
    render(<PurchaseReceiptDetailPage receiptId="receipt-1" />);
    expect(screen.getByRole('heading', { name: 'PR-000001' })).toBeInTheDocument();
    expect(screen.getByText('PO-000001')).toBeInTheDocument();
    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.getByText('A-01')).toBeInTheDocument();
    expect(screen.getAllByText('4,0000')).not.toHaveLength(0);
    expect(screen.getByText('Embalagem danificada')).toBeInTheDocument();
  });

  it('liga o detalhe ao pedido original', () => {
    render(<PurchaseReceiptDetailPage receiptId="receipt-1" />);
    expect(screen.getByRole('link', { name: 'Ver pedido' })).toHaveAttribute(
      'href',
      '/purchases/orders/order-1',
    );
  });

  it('renderiza loading e erro', () => {
    detail.mockReturnValueOnce({ isLoading: true });
    const { rerender } = render(<PurchaseReceiptDetailPage receiptId="receipt-1" />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    detail.mockReturnValueOnce({ isLoading: false, isError: true, refetch: vi.fn() });
    rerender(<PurchaseReceiptDetailPage receiptId="receipt-1" />);
    expect(screen.getByText('Não foi possível carregar o recebimento.')).toBeInTheDocument();
  });
});
