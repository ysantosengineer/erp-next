import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderFormPage } from './purchase-order-form-page';
const create = vi.fn();
const update = vi.fn();
const push = vi.fn();
const detail = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../hooks/use-purchase-orders', () => ({
  usePurchaseOrder: (...args: unknown[]) => detail(...args),
  usePurchaseOrderOptions: () => ({
    isLoading: false,
    data: {
      suppliers: [
        { id: '10000000-0000-4000-8000-000000000001', name: 'Fornecedor', document: '123' },
      ],
      warehouses: [{ id: '20000000-0000-4000-8000-000000000001', name: 'Principal', code: 'MAIN' }],
      products: [
        {
          id: '30000000-0000-4000-8000-000000000001',
          name: 'Café',
          sku: 'CAF-1',
          unitSymbol: 'UN',
          suggestedUnitCost: '10.25',
        },
      ],
    },
  }),
  useCreatePurchaseOrder: () => ({ mutateAsync: create, isPending: false }),
  useUpdatePurchaseOrder: () => ({ mutateAsync: update, isPending: false }),
}));
describe('PurchaseOrderFormPage', () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: 'new-order' });
    update.mockReset();
    push.mockReset();
    detail.mockReset().mockReturnValue({ isLoading: false, isError: false, data: undefined });
  });
  it('organiza o formulário dedicado e adiciona/remove produto sem duplicar', async () => {
    render(<PurchaseOrderFormPage />);
    expect(screen.getByRole('heading', { name: 'Fornecedor e destino' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Itens' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Produto' }));
    await userEvent.click(screen.getByRole('option', { name: /Café/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByText('Café')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 10,25')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Remover item 1' }));
    expect(screen.queryByText('CAF-1')).not.toBeInTheDocument();
  });
  it('bloqueia edição visual de pedido aprovado', () => {
    detail.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'order',
        number: 'PO-1',
        status: 'APPROVED',
        supplier: { id: 's' },
        warehouse: { id: 'w' },
        items: [],
        discountAmount: '0',
        freightAmount: '0',
        otherAmount: '0',
      },
    });
    render(<PurchaseOrderFormPage orderId="order" />);
    expect(screen.getByText('Somente pedidos em rascunho podem ser editados.')).toBeInTheDocument();
  });
});
