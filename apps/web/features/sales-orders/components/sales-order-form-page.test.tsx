import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesOrderFormPage } from './sales-order-form-page';

const create = vi.fn();
const update = vi.fn();
const push = vi.fn();
const detail = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../hooks/use-sales-orders', () => ({
  useSalesOrder: (...args: unknown[]) => detail(...args),
  useSalesOrderOptions: () => ({
    isLoading: false,
    data: {
      customers: [
        {
          id: '10000000-0000-4000-8000-000000000001',
          name: 'Cliente',
          document: '123',
          creditLimit: '5.00',
        },
      ],
      warehouses: [{ id: '20000000-0000-4000-8000-000000000001', name: 'Principal', code: 'MAIN' }],
      products: [
        {
          id: '30000000-0000-4000-8000-000000000001',
          name: 'Café',
          sku: 'CAF-1',
          unitSymbol: 'UN',
          suggestedUnitPrice: '10.25',
        },
      ],
    },
  }),
  useCreateSalesOrder: () => ({ mutateAsync: create, isPending: false }),
  useUpdateSalesOrder: () => ({ mutateAsync: update, isPending: false }),
}));

describe('SalesOrderFormPage', () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: 'new-order' });
    update.mockReset();
    push.mockReset();
    detail.mockReset().mockReturnValue({ isLoading: false, isError: false, data: undefined });
  });

  it('adiciona produto com preço sugerido, impede duplicidade e permite remover', async () => {
    render(<SalesOrderFormPage />);
    expect(screen.getByRole('heading', { name: 'Cliente e origem' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Produto' }));
    await userEvent.click(screen.getByRole('option', { name: /Café/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByText('CAF-1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Produto' }));
    await userEvent.click(screen.getByRole('option', { name: /Café/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getAllByLabelText(/Quantidade do item/)).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Remover item 1' }));
    expect(screen.queryByText('CAF-1')).not.toBeInTheDocument();
  });

  it('exibe warning informativo quando total supera limite cadastrado', async () => {
    render(<SalesOrderFormPage />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Cliente' }));
    await userEvent.click(screen.getByRole('option', { name: /Cliente/ }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Produto' }));
    await userEvent.click(screen.getByRole('option', { name: /Café/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByRole('status')).toHaveTextContent('supera o limite de crédito cadastrado');
  });

  it('bloqueia edição visual de pedido confirmado', () => {
    detail.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'order',
        number: 'SO-1',
        status: 'CONFIRMED',
        customer: { id: 'c' },
        warehouse: { id: 'w' },
        orderDate: '2026-08-23',
        items: [],
        discountAmount: '0',
        freightAmount: '0',
        otherAmount: '0',
      },
    });
    render(<SalesOrderFormPage orderId="order" />);
    expect(screen.getByText('Somente pedidos em rascunho podem ser editados.')).toBeInTheDocument();
  });

  it('hidrata cliente e depósito antes de salvar a edição de um rascunho', async () => {
    update.mockResolvedValue({ id: 'order' });
    detail.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'order',
        number: 'SO-1',
        status: 'DRAFT',
        customer: {
          id: '10000000-0000-4000-8000-000000000001',
          name: 'Cliente',
          document: '123',
          creditLimit: '5.00',
        },
        warehouse: {
          id: '20000000-0000-4000-8000-000000000001',
          name: 'Principal',
          code: 'MAIN',
        },
        orderDate: '2026-08-23',
        expectedDeliveryDate: null,
        notes: null,
        items: [
          {
            id: 'item',
            productId: '30000000-0000-4000-8000-000000000001',
            productName: 'Café',
            productSku: 'CAF-1',
            unitSymbol: 'UN',
            quantity: '1.0000',
            unitPrice: '10.25',
            discountAmount: '0.00',
          },
        ],
        discountAmount: '0.00',
        freightAmount: '0.00',
        otherAmount: '0.00',
      },
    });

    render(<SalesOrderFormPage orderId="order" />);

    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'order',
          input: expect.objectContaining({
            customerId: '10000000-0000-4000-8000-000000000001',
            warehouseId: '20000000-0000-4000-8000-000000000001',
          }),
        }),
      );
    });
  });
});
