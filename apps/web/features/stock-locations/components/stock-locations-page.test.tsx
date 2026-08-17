import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { StockLocationsPage } from './stock-locations-page';

const query = vi.fn();
const permissions = new Set<string>();
vi.mock('../hooks/use-stock-locations', () => ({
  useStockLocations: (warehouseId: string, params: unknown) => query(warehouseId, params),
}));
vi.mock('../../../hooks/use-debounced-value', () => ({
  useDebouncedValue: (value: string) => value,
}));
vi.mock('../../../components/navigation/can', () => ({
  usePermission: (permission: string) => permissions.has(permission),
}));
vi.mock('./stock-location-form-dialog', () => ({
  StockLocationFormDialog: ({
    location,
    disabled,
  }: {
    location?: { id: string };
    disabled?: boolean;
  }) => <button disabled={disabled}>{location ? 'Editar endereço' : 'Novo endereço'}</button>,
}));
vi.mock('./stock-location-status-dialog', () => ({
  StockLocationStatusDialog: () => <button>Inativar endereço</button>,
}));
const success = {
  data: {
    warehouse: { id: 'w1', name: 'Principal', code: 'MAIN', isActive: true },
    data: [
      {
        id: 'l1',
        warehouseId: 'w1',
        code: 'A-01',
        description: null,
        zone: 'A',
        aisle: '01',
        rack: 'B',
        level: '02',
        position: '04',
        capacity: '100.125',
        isActive: true,
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

describe('StockLocationsPage', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockReturnValue(success);
    permissions.clear();
  });
  it('lista endereço e contexto do depósito', () => {
    render(<StockLocationsPage warehouseId="w1" />);
    expect(screen.getByRole('heading', { name: 'Principal · MAIN' })).toBeVisible();
    expect(screen.getByText('A-01')).toBeVisible();
    expect(screen.getByText('100,125')).toBeVisible();
  });
  it('exibe loading', () => {
    query.mockReturnValue({ ...success, data: undefined, isLoading: true });
    render(<StockLocationsPage warehouseId="w1" />);
    expect(screen.getByTestId('locations-loading')).toBeVisible();
  });
  it('exibe empty', () => {
    query.mockReturnValue({ ...success, data: { ...success.data, data: [] } });
    render(<StockLocationsPage warehouseId="w1" />);
    expect(screen.getByText('Nenhum endereço encontrado')).toBeVisible();
  });
  it('exibe erro e retry', () => {
    query.mockReturnValue({ ...success, data: undefined, isError: true, error: new Error('x') });
    render(<StockLocationsPage warehouseId="w1" />);
    expect(screen.getByText('Não foi possível carregar os endereços.')).toBeVisible();
  });
  it('envia pesquisa e zona ao servidor', async () => {
    const user = userEvent.setup();
    render(<StockLocationsPage warehouseId="w1" />);
    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar endereços' }), 'rack');
    await user.type(screen.getByRole('textbox', { name: 'Filtrar por zona' }), 'b');
    expect(query).toHaveBeenLastCalledWith(
      'w1',
      expect.objectContaining({ search: 'rack', zone: 'B' }),
    );
  });
  it('filtra status e pagina no servidor', async () => {
    const user = userEvent.setup();
    render(<StockLocationsPage warehouseId="w1" />);
    await user.click(screen.getByRole('combobox', { name: 'Filtrar por status' }));
    await user.click(screen.getByRole('option', { name: 'Inativos' }));
    expect(query).toHaveBeenLastCalledWith('w1', expect.objectContaining({ status: 'inactive' }));
    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(query).toHaveBeenLastCalledWith('w1', expect.objectContaining({ page: 2 }));
  });
  it('aplica permissões às ações', () => {
    const { rerender } = render(<StockLocationsPage warehouseId="w1" />);
    expect(screen.queryByText('Novo endereço')).not.toBeInTheDocument();
    permissions.add(PERMISSIONS.STOCK_LOCATIONS_CREATE);
    permissions.add(PERMISSIONS.STOCK_LOCATIONS_UPDATE);
    permissions.add(PERMISSIONS.STOCK_LOCATIONS_MANAGE_STATUS);
    rerender(<StockLocationsPage warehouseId="w1" />);
    expect(screen.getByText('Novo endereço')).toBeVisible();
    expect(screen.getByText('Editar endereço')).toBeVisible();
    expect(screen.getByText('Inativar endereço')).toBeVisible();
  });
  it('bloqueia criação e avisa quando depósito está inativo', () => {
    permissions.add(PERMISSIONS.STOCK_LOCATIONS_CREATE);
    query.mockReturnValue({
      ...success,
      data: { ...success.data, warehouse: { ...success.data.warehouse, isActive: false } },
    });
    render(<StockLocationsPage warehouseId="w1" />);
    expect(screen.getByText(/depósito está inativo/i)).toBeVisible();
    expect(screen.getByText('Novo endereço')).toBeDisabled();
  });
});
