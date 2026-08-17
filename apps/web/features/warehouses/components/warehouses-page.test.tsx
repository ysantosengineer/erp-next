import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { WarehousesPage } from './warehouses-page';

const query = vi.fn();
const permissions = new Set<string>();
vi.mock('../hooks/use-warehouses', () => ({ useWarehouses: (params: unknown) => query(params) }));
vi.mock('../../../hooks/use-debounced-value', () => ({
  useDebouncedValue: (value: string) => value,
}));
vi.mock('../../../components/navigation/can', () => ({
  usePermission: (permission: string) => permissions.has(permission),
}));
vi.mock('./warehouse-form-dialog', () => ({
  WarehouseFormDialog: ({ warehouse }: { warehouse?: { id: string } }) => (
    <button>{warehouse ? 'Editar depósito' : 'Novo depósito'}</button>
  ),
}));
vi.mock('./warehouse-status-dialog', () => ({
  WarehouseStatusDialog: () => <button>Inativar depósito</button>,
}));

const success = {
  data: {
    data: [
      {
        id: '1',
        name: 'Principal',
        code: 'MAIN',
        description: 'Geral',
        isActive: true,
        locationCount: 2,
        createdAt: '',
        updatedAt: '',
      },
    ],
    meta: { page: 1, limit: 20, total: 21, totalPages: 2 },
  },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

describe('WarehousesPage', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockReturnValue(success);
    permissions.clear();
  });
  it('lista depósitos e quantidade real de endereços', () => {
    render(<WarehousesPage />);
    expect(screen.getByText('Principal')).toBeVisible();
    expect(screen.getByText('MAIN')).toBeVisible();
    expect(screen.getByText('2')).toBeVisible();
  });
  it('exibe loading', () => {
    query.mockReturnValue({ ...success, data: undefined, isLoading: true });
    render(<WarehousesPage />);
    expect(screen.getByTestId('warehouses-loading')).toBeVisible();
  });
  it('exibe empty', () => {
    query.mockReturnValue({
      ...success,
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });
    render(<WarehousesPage />);
    expect(screen.getByText('Nenhum depósito encontrado')).toBeVisible();
  });
  it('exibe erro e retry', () => {
    query.mockReturnValue({ ...success, data: undefined, isError: true, error: new Error('x') });
    render(<WarehousesPage />);
    expect(screen.getByText('Não foi possível carregar os depósitos.')).toBeVisible();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeVisible();
  });
  it('pesquisa server-side', async () => {
    const user = userEvent.setup();
    render(<WarehousesPage />);
    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar depósitos' }), 'sec');
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'sec', page: 1 }));
  });
  it('filtra status server-side', async () => {
    const user = userEvent.setup();
    render(<WarehousesPage />);
    await user.click(screen.getByRole('combobox', { name: 'Filtrar por status' }));
    await user.click(screen.getByRole('option', { name: 'Inativos' }));
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'inactive' }));
  });
  it('pagina no servidor', async () => {
    const user = userEvent.setup();
    render(<WarehousesPage />);
    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });
  it('aplica permissões a criação, edição, status e endereços', () => {
    const { rerender } = render(<WarehousesPage />);
    expect(screen.queryByText('Novo depósito')).not.toBeInTheDocument();
    permissions.add(PERMISSIONS.WAREHOUSES_CREATE);
    permissions.add(PERMISSIONS.WAREHOUSES_UPDATE);
    permissions.add(PERMISSIONS.WAREHOUSES_MANAGE_STATUS);
    permissions.add(PERMISSIONS.STOCK_LOCATIONS_READ);
    rerender(<WarehousesPage />);
    expect(screen.getByText('Novo depósito')).toBeVisible();
    expect(screen.getByText('Editar depósito')).toBeVisible();
    expect(screen.getByText('Inativar depósito')).toBeVisible();
    expect(screen.getByRole('link', { name: /endereços/i })).toHaveAttribute(
      'href',
      '/warehouses/1/locations',
    );
  });
});
