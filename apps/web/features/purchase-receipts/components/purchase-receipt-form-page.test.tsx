import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseReceiptFormPage } from './purchase-receipt-form-page';

const receivable = vi.fn();
const create = vi.fn();
const push = vi.fn();
let pending = false;
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../hooks/use-purchase-receipts', () => ({
  useReceivablePurchaseOrder: (...args: unknown[]) => receivable(...args),
  useCreatePurchaseReceipt: () => ({ mutateAsync: create, isPending: pending }),
}));

const order = {
  orderId: '10000000-0000-4000-8000-000000000001',
  number: 'PO-000001',
  status: 'APPROVED',
  supplier: { id: 'supplier', name: 'Fornecedor', document: '123', isActive: true },
  warehouse: { id: 'warehouse', name: 'Principal', code: 'MAIN', isActive: true },
  expectedDeliveryDate: null,
  createdAt: '2026-08-23T10:00:00Z',
  items: [
    {
      id: '20000000-0000-4000-8000-000000000001',
      productId: 'product-a',
      productName: 'Produto A',
      productSku: 'PROD-A',
      unitSymbol: 'UN',
      orderedQuantity: '10.0000',
      receivedQuantity: '0.0000',
      pendingQuantity: '10.0000',
      unitCost: '5.00',
    },
    {
      id: '20000000-0000-4000-8000-000000000002',
      productId: 'product-b',
      productName: 'Produto B',
      productSku: 'PROD-B',
      unitSymbol: 'KG',
      orderedQuantity: '7.0000',
      receivedQuantity: '2.0000',
      pendingQuantity: '5.0000',
      unitCost: '9.00',
    },
  ],
  locations: [
    {
      id: '30000000-0000-4000-8000-000000000001',
      code: 'A-01',
      description: null,
      zone: 'A',
      aisle: '01',
      rack: 'R1',
      level: null,
      position: null,
    },
  ],
};

describe('PurchaseReceiptFormPage', () => {
  beforeEach(() => {
    pending = false;
    push.mockReset();
    create.mockReset().mockResolvedValue({
      id: 'receipt-1',
      number: 'PR-000001',
      purchaseOrder: { id: order.orderId },
      items: [],
    });
    receivable.mockReset().mockReturnValue({
      isLoading: false,
      isError: false,
      data: order,
      refetch: vi.fn(),
    });
  });

  it('exibe quantidade pedida, recebida e pendente iniciando em zero', async () => {
    render(<PurchaseReceiptFormPage orderId={order.orderId} />);
    expect(screen.getByText('Produto A')).toBeInTheDocument();
    expect(screen.getByText('Produto B')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('0')).toHaveLength(2);
    expect(screen.getAllByText('10,0000')).not.toHaveLength(0);
    expect(screen.getAllByText('5,0000')).not.toHaveLength(0);
  });

  it('preenche todas as pendências somente por ação explícita', async () => {
    render(<PurchaseReceiptFormPage orderId={order.orderId} />);
    await userEvent.click(screen.getByRole('button', { name: 'Receber todas as pendências' }));
    expect(screen.getByDisplayValue('10.0000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5.0000')).toBeInTheDocument();
    expect(screen.getByText('Recebido', { selector: 'strong' })).toBeInTheDocument();
  });

  it('impede quantidade acima do pendente antes da API', async () => {
    render(<PurchaseReceiptFormPage orderId={order.orderId} />);
    const quantity = screen.getByLabelText('Receber agora — Produto A');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '11');
    await selectLocation();
    await userEvent.click(screen.getByRole('button', { name: 'Revisar e confirmar' }));
    expect(await screen.findByText('A quantidade excede o pendente.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('confirma recebimento parcial com chave idempotente e navega ao detalhe', async () => {
    render(<PurchaseReceiptFormPage orderId={order.orderId} />);
    const quantity = screen.getByLabelText('Receber agora — Produto A');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '4,5');
    await selectLocation();
    await userEvent.type(screen.getByLabelText('Observação — Produto A'), 'Caixa avariada');
    await userEvent.click(screen.getByRole('button', { name: 'Revisar e confirmar' }));
    expect(await screen.findByText('Confirmar recebimento?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar recebimento' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toMatchObject({
      purchaseOrderId: order.orderId,
      items: [
        {
          purchaseOrderItemId: order.items[0].id,
          locationId: order.locations[0].id,
          receivedQuantity: '4.5',
          discrepancyReason: 'Caixa avariada',
        },
      ],
    });
    expect(create.mock.calls[0][0].idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(push).toHaveBeenCalledWith('/purchases/receipts/receipt-1');
  });

  it('desabilita submissão enquanto processa', () => {
    pending = true;
    render(<PurchaseReceiptFormPage orderId={order.orderId} />);
    expect(screen.getByRole('button', { name: 'Revisar e confirmar' })).toBeDisabled();
  });

  it('renderiza loading e indisponibilidade do pedido', () => {
    receivable.mockReturnValue({ isLoading: true });
    const { rerender } = render(<PurchaseReceiptFormPage orderId={order.orderId} />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    receivable.mockReturnValue({ isLoading: false, isError: true, refetch: vi.fn() });
    rerender(<PurchaseReceiptFormPage orderId={order.orderId} />);
    expect(screen.getByText('O pedido não está disponível para recebimento.')).toBeInTheDocument();
  });
});

async function selectLocation() {
  await userEvent.click(screen.getAllByRole('combobox')[0]);
  await userEvent.click(screen.getByRole('option', { name: /A-01/ }));
}
