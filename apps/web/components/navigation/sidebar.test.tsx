import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../lib/permissions/permissions';
import { Sidebar } from './sidebar';

const useAuthMock = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => '/users' }));
vi.mock('../../features/auth/hooks/use-auth', () => ({ useAuth: () => useAuthMock() }));

describe('Sidebar', () => {
  beforeEach(() => useAuthMock.mockReset());

  it('expande a administração automaticamente para a rota atual', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.ROLES_READ] },
    });

    render(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Administração' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Usuários' })).toHaveAttribute('href', '/users');
    expect(screen.getByRole('link', { name: 'Papéis e permissões' })).toHaveAttribute(
      'href',
      '/roles',
    );
  });

  it('oculta módulos sem itens permitidos', () => {
    useAuthMock.mockReturnValue({ user: { permissions: [] } });

    render(<Sidebar />);

    expect(screen.queryByRole('button', { name: 'Cadastros' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Administração' })).not.toBeInTheDocument();
  });

  it('expande e recolhe os submódulos de cadastros', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({
      user: {
        permissions: [
          PERMISSIONS.CATEGORIES_READ,
          PERMISSIONS.UNITS_READ,
          PERMISSIONS.SUPPLIERS_READ,
          PERMISSIONS.PRODUCTS_READ,
          PERMISSIONS.CUSTOMERS_READ,
        ],
      },
    });

    render(<Sidebar />);

    const registrations = screen.getByRole('button', { name: 'Cadastros' });
    expect(registrations).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Categorias' })).not.toBeInTheDocument();

    await user.click(registrations);

    expect(registrations).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('link', { name: 'Unidades de medida' })).toHaveAttribute('href', '/units');
    expect(screen.getByRole('link', { name: 'Fornecedores' })).toHaveAttribute('href', '/suppliers');
    expect(screen.getByRole('link', { name: 'Produtos' })).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/customers');

    await user.click(registrations);
    expect(screen.queryByRole('link', { name: 'Categorias' })).not.toBeInTheDocument();
  });

  it('exibe os submódulos de estoque conforme as permissões', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({
      user: {
        permissions: [
          PERMISSIONS.INVENTORY_READ,
          PERMISSIONS.INVENTORY_MOVEMENTS_READ,
          PERMISSIONS.INVENTORY_COUNTS_READ,
          PERMISSIONS.WAREHOUSES_READ,
        ],
      },
    });

    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Estoque' }));

    expect(screen.getByRole('link', { name: 'Saldos' })).toHaveAttribute('href', '/inventory');
    expect(screen.getByRole('link', { name: 'Movimentações' })).toHaveAttribute(
      'href',
      '/inventory/movements',
    );
    expect(screen.getByRole('link', { name: 'Inventários' })).toHaveAttribute(
      'href',
      '/inventory/counts',
    );
    expect(screen.getByRole('link', { name: 'Depósitos e endereços' })).toHaveAttribute(
      'href',
      '/warehouses',
    );
    expect(screen.queryByRole('link', { name: 'Reservas' })).not.toBeInTheDocument();
  });

  it('separa compras e vendas por permissão', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({
      user: { permissions: [PERMISSIONS.PURCHASE_RECEIPTS_READ, PERMISSIONS.SALES_ORDERS_READ] },
    });

    render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Compras' }));

    expect(screen.getByRole('link', { name: 'Recebimentos' })).toHaveAttribute(
      'href',
      '/purchases/receipts',
    );
    expect(screen.queryByRole('link', { name: 'Pedidos de compra' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Vendas' }));
    expect(screen.getByRole('link', { name: 'Pedidos de venda' })).toHaveAttribute(
      'href',
      '/sales/orders',
    );
  });

  it('separa títulos e fluxo de caixa por permissões financeiras', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({ user: { permissions: [PERMISSIONS.FINANCE_READ] } });

    const { rerender } = render(<Sidebar />);
    await user.click(screen.getByRole('button', { name: 'Financeiro' }));

    expect(screen.getByRole('link', { name: 'Contas a pagar' })).toHaveAttribute(
      'href',
      '/finance/payables',
    );
    expect(screen.getByRole('link', { name: 'Contas a receber' })).toHaveAttribute(
      'href',
      '/finance/receivables',
    );
    expect(screen.queryByRole('link', { name: 'Fluxo de caixa' })).not.toBeInTheDocument();

    useAuthMock.mockReturnValue({ user: { permissions: [PERMISSIONS.FINANCE_CASH_FLOW_READ] } });
    rerender(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Financeiro' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Fluxo de caixa' })).toHaveAttribute(
      'href',
      '/finance/cash-flow',
    );
  });
});
