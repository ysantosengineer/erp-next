import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { CustomersPage } from './customers-page';

const query = vi.fn();
const permissions = new Set<string>();

vi.mock('../hooks/use-customers', () => ({ useCustomers: (params: unknown) => query(params) }));
vi.mock('../../../components/navigation/can', () => ({
  usePermission: (permission: string) => permissions.has(permission),
}));
vi.mock('./customer-form-dialog', () => ({
  CustomerFormDialog: ({ customer }: { customer?: { id: string } }) => (
    <button>{customer ? 'Editar cliente' : 'Novo cliente'}</button>
  ),
}));
vi.mock('./customer-status-dialog', () => ({
  CustomerStatusDialog: () => <button>Inativar cliente</button>,
}));

const success = {
  data: {
    data: [
      {
        id: '1',
        type: 'COMPANY',
        name: 'Empresa Cliente',
        tradeName: 'Cliente SA',
        document: '04252011000110',
        email: 'financeiro@example.com',
        phone: null,
        creditLimit: '1500.50',
        notes: null,
        isActive: true,
        address: null,
        createdAt: '',
        updatedAt: '',
      },
    ],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

describe('CustomersPage', () => {
  beforeEach(() => {
    permissions.clear();
    query.mockReset();
    query.mockReturnValue(success);
  });

  it('lista cliente, documento e limite formatados', () => {
    render(<CustomersPage />);
    expect(screen.getByText('Empresa Cliente')).toBeVisible();
    expect(screen.getByText('04.252.011/0001-10')).toBeVisible();
    expect(screen.getByText('R$ 1.500,50')).toBeVisible();
  });

  it('exibe loading', () => {
    query.mockReturnValue({ ...success, data: undefined, isLoading: true });
    render(<CustomersPage />);
    expect(screen.getByTestId('customers-loading')).toBeVisible();
  });

  it('exibe estado vazio', () => {
    query.mockReturnValue({
      ...success,
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });
    render(<CustomersPage />);
    expect(screen.getByText('Nenhum cliente encontrado')).toBeVisible();
  });

  it('exibe erro com ação para tentar novamente', () => {
    query.mockReturnValue({ ...success, data: undefined, isError: true, error: new Error('fail') });
    render(<CustomersPage />);
    expect(screen.getByText('Não foi possível carregar os clientes.')).toBeVisible();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeVisible();
  });

  it('respeita permissão de criação', () => {
    const { rerender } = render(<CustomersPage />);
    expect(screen.queryByText('Novo cliente')).not.toBeInTheDocument();
    permissions.add(PERMISSIONS.CUSTOMERS_CREATE);
    rerender(<CustomersPage />);
    expect(screen.getByText('Novo cliente')).toBeVisible();
  });

  it('respeita permissões de edição e status', () => {
    const { rerender } = render(<CustomersPage />);
    expect(screen.queryByText('Editar cliente')).not.toBeInTheDocument();
    expect(screen.queryByText('Inativar cliente')).not.toBeInTheDocument();
    permissions.add(PERMISSIONS.CUSTOMERS_UPDATE);
    permissions.add(PERMISSIONS.CUSTOMERS_MANAGE_STATUS);
    rerender(<CustomersPage />);
    expect(screen.getByText('Editar cliente')).toBeVisible();
    expect(screen.getByText('Inativar cliente')).toBeVisible();
  });
});
