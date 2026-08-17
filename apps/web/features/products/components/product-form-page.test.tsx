import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/api-error';
import { ProductFormPage } from './product-form-page';

const push = vi.fn();
const createAsync = vi.fn();
const updateAsync = vi.fn();
const productQuery = vi.fn();
const option = {
  data: { data: [{ id: 'option', name: 'Opção', symbol: 'UN', document: '1', isActive: true }] },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../hooks/use-products', () => ({
  useCreateProduct: () => ({ mutateAsync: createAsync, isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: updateAsync, isPending: false }),
  useProduct: (id?: string) => productQuery(id),
  useProductOptions: () => ({ categories: option, units: option, suppliers: option }),
}));

describe('ProductFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    createAsync.mockResolvedValue({});
    updateAsync.mockResolvedValue({});
  });

  async function fillRequired() {
    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'Café especial');
    await userEvent.clear(screen.getByRole('textbox', { name: 'SKU' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'SKU' }), 'cafe-001');
    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }));
    await userEvent.click(screen.getByRole('option', { name: 'Opção' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Unidade de medida' }));
    await userEvent.click(screen.getByRole('option', { name: 'Opção (UN)' }));
  }

  it('cria produto com payload decimal canônico e redireciona', async () => {
    render(<ProductFormPage />);
    await fillRequired();
    await userEvent.clear(screen.getByRole('textbox', { name: 'Preço de custo' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Preço de custo' }), '1.299,90');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar produto' }));
    await waitFor(() =>
      expect(createAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'CAFE-001', costPrice: '1299.90', primarySupplierId: null }),
      ),
    );
    expect(push).toHaveBeenCalledWith('/products');
  });

  it('mostra validações antes de enviar', async () => {
    render(<ProductFormPage />);
    await userEvent.clear(screen.getByRole('textbox', { name: 'SKU' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar produto' }));
    expect(await screen.findByText('Informe um nome com ao menos 2 caracteres.')).toBeVisible();
    expect(screen.getByText('Informe o SKU.')).toBeVisible();
    expect(createAsync).not.toHaveBeenCalled();
  });

  it('associa conflito de SKU ao campo correto', async () => {
    createAsync.mockRejectedValueOnce(
      new ApiError(409, { code: 'PRODUCT_SKU_EXISTS', message: 'duplicado' }),
    );
    render(<ProductFormPage />);
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar produto' }));
    expect(await screen.findByText('Este SKU já está cadastrado na empresa.')).toBeVisible();
  });

  it('preenche e atualiza um produto existente', async () => {
    productQuery.mockReturnValue({
      data: {
        id: 'product',
        name: 'Produto atual',
        description: null,
        sku: 'ATUAL-1',
        barcode: null,
        costPrice: '10.50',
        salePrice: '20.00',
        weight: null,
        height: null,
        width: null,
        length: null,
        minimumStock: '1.000',
        isActive: true,
        category: { id: 'option', name: 'Opção', isActive: true },
        unit: { id: 'option', name: 'Opção', symbol: 'UN', isActive: true },
        primarySupplier: null,
        createdAt: '',
        updatedAt: '',
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<ProductFormPage productId="product" />);
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Produto atual'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar produto' }));
    await waitFor(() =>
      expect(updateAsync).toHaveBeenCalledWith({
        id: 'product',
        input: expect.objectContaining({ name: 'Produto atual', costPrice: '10.50' }),
      }),
    );
  });
});
