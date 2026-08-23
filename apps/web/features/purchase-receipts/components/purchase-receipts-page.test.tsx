import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { PurchaseReceiptsPage } from './purchase-receipts-page';

const permissions: string[] = [];
const list = vi.fn();
vi.mock('../../auth/hooks/use-auth', () => ({ useAuth: () => ({ user: { permissions } }) }));
vi.mock('../hooks/use-purchase-receipts', () => ({
  usePurchaseReceipts: (...args: unknown[]) => list(...args),
  usePurchaseReceiptOptions: () => ({ data: { suppliers: [], warehouses: [] } }),
}));

const empty = {
  isLoading: false,
  isError: false,
  data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
  refetch: vi.fn(),
};

describe('PurchaseReceiptsPage', () => {
  beforeEach(() => {
    permissions.splice(0);
    list.mockReset().mockReturnValue(empty);
  });

  it('exibe filtros e estado vazio', () => {
    render(<PurchaseReceiptsPage />);
    expect(screen.getByText('Nenhum recebimento encontrado')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Pesquisar recebimentos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Novo recebimento' })).not.toBeInTheDocument();
  });

  it('controla a criação por permissão', () => {
    permissions.push(PERMISSIONS.PURCHASE_RECEIPTS_CREATE);
    render(<PurchaseReceiptsPage />);
    expect(screen.getByRole('link', { name: 'Novo recebimento' })).toHaveAttribute(
      'href',
      '/purchases/orders?status=APPROVED',
    );
  });

  it('renderiza dados operacionais sem UUID como identificador principal', () => {
    list.mockReturnValue({
      ...empty,
      data: {
        data: [
          {
            id: 'receipt-id',
            number: 'PR-000123',
            purchaseOrder: { number: 'PO-000456' },
            supplier: { name: 'Fornecedor' },
            warehouse: { name: 'Principal' },
            receivedAt: '2026-08-23T10:00:00Z',
            itemCount: 2,
            totalQuantity: '7.5000',
            receivedBy: { name: 'Yuri' },
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });
    render(<PurchaseReceiptsPage />);
    expect(screen.getByText('PR-000123')).toBeInTheDocument();
    expect(screen.getByText('PO-000456')).toBeInTheDocument();
    expect(screen.getByText('7,5000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Detalhes' })).toHaveAttribute(
      'href',
      '/purchases/receipts/receipt-id',
    );
  });

  it('renderiza loading e erro', () => {
    list.mockReturnValueOnce({ ...empty, isLoading: true, data: undefined });
    const { rerender } = render(<PurchaseReceiptsPage />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    list.mockReturnValueOnce({ ...empty, isError: true, data: undefined });
    rerender(<PurchaseReceiptsPage />);
    expect(screen.getByText('Não foi possível carregar os recebimentos.')).toBeInTheDocument();
  });
});
