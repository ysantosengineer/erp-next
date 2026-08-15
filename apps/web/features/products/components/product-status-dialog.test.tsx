import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductStatusDialog } from './product-status-dialog';

const mutateAsync = vi.fn();
vi.mock('../hooks/use-products', () => ({
  useUpdateProductStatus: () => ({ mutateAsync, isPending: false }),
}));

const product = {
  id: '1',
  name: 'Café',
  description: null,
  sku: 'CAFE',
  barcode: null,
  costPrice: '1.00',
  salePrice: '2.00',
  weight: null,
  height: null,
  width: null,
  length: null,
  minimumStock: '0.000',
  isActive: true,
  category: { id: 'c', name: 'Categoria', isActive: true },
  unit: { id: 'u', name: 'Unidade', symbol: 'UN', isActive: true },
  primarySupplier: null,
  createdAt: '',
  updatedAt: '',
};

describe('ProductStatusDialog', () => {
  it('confirma inativação preservando histórico', async () => {
    mutateAsync.mockResolvedValueOnce({});
    render(<ProductStatusDialog product={product} />);
    await userEvent.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(screen.getByText(/histórico será preservado/i)).toBeVisible();
    await userEvent.click(screen.getAllByRole('button', { name: 'Inativar' }).at(-1)!);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ id: '1', isActive: false }));
  });

  it('oferece ativação para produto inativo', () => {
    render(<ProductStatusDialog product={{ ...product, isActive: false }} />);
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeVisible();
  });
});
