import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { ProductsPage } from './products-page';

const productsQuery = vi.fn();
const permissions = new Set<string>();
const optionQuery = { data: { data: [] }, isLoading: false, isError: false, refetch: vi.fn() };

vi.mock('../hooks/use-products', () => ({
  useProducts: (params: unknown) => productsQuery(params),
  useProductOptions: () => ({
    categories: optionQuery,
    units: optionQuery,
    suppliers: optionQuery,
  }),
}));
vi.mock('../../../components/navigation/can', () => ({
  usePermission: (code: string) => permissions.has(code),
}));
vi.mock('./product-status-dialog', () => ({
  ProductStatusDialog: () => <button>Inativar</button>,
}));

const product = {
  id: '1',
  name: 'Café especial',
  description: null,
  sku: 'CAFE-001',
  barcode: '7891234567890',
  costPrice: '12.30',
  salePrice: '20.00',
  weight: null,
  height: null,
  width: null,
  length: null,
  minimumStock: '10.000',
  isActive: true,
  category: { id: 'c', name: 'Alimentos', isActive: true },
  unit: { id: 'u', name: 'Unidade', symbol: 'UN', isActive: true },
  primarySupplier: null,
  createdAt: '',
  updatedAt: '',
};

describe('ProductsPage', () => {
  beforeEach(() => {
    permissions.clear();
    productsQuery.mockReturnValue({
      data: { data: [product], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('lista produto com preços, SKU e estoque formatados', () => {
    render(<ProductsPage />);
    expect(screen.getByText('Café especial')).toBeVisible();
    expect(screen.getByText('CAFE-001')).toBeVisible();
    expect(screen.getByText('R$ 12,30')).toBeVisible();
    expect(screen.getByText('10,000')).toBeVisible();
  });

  it('exibe criação apenas com products.create', () => {
    const view = render(<ProductsPage />);
    expect(screen.queryByText('Novo produto')).not.toBeInTheDocument();
    permissions.add(PERMISSIONS.PRODUCTS_CREATE);
    view.rerender(<ProductsPage />);
    expect(screen.getByText('Novo produto')).toHaveAttribute('href', '/products/new');
  });

  it('exibe edição e status de acordo com permissões', () => {
    permissions.add(PERMISSIONS.PRODUCTS_UPDATE);
    permissions.add(PERMISSIONS.PRODUCTS_MANAGE_STATUS);
    render(<ProductsPage />);
    expect(screen.getByText('Editar')).toHaveAttribute('href', '/products/1/edit');
    expect(screen.getByText('Inativar')).toBeVisible();
  });

  it('envia status selecionado como filtro de servidor', async () => {
    render(<ProductsPage />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Filtrar por status' }));
    await userEvent.click(screen.getByRole('option', { name: 'Inativos' }));
    expect(productsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'inactive', page: 1 }),
    );
  });

  it('renderiza estados vazio e de erro', () => {
    productsQuery.mockReturnValueOnce({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    const view = render(<ProductsPage />);
    expect(screen.getByText('Nenhum produto encontrado')).toBeVisible();
    productsQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('falha'),
      refetch: vi.fn(),
    });
    view.rerender(<ProductsPage />);
    expect(screen.getByText('Não foi possível carregar os produtos.')).toBeVisible();
  });
});
