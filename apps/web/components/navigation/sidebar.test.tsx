import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../lib/permissions/permissions';
import { Sidebar } from './sidebar';

const useAuthMock = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => '/users' }));
vi.mock('../../features/auth/hooks/use-auth', () => ({ useAuth: () => useAuthMock() }));

describe('Sidebar', () => {
  beforeEach(() => useAuthMock.mockReset());

  it('exibe links administrativos permitidos', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.ROLES_READ] },
    });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Usuários' })).toHaveAttribute('href', '/users');
    expect(screen.getByRole('link', { name: 'Papéis e permissões' })).toHaveAttribute(
      'href',
      '/roles',
    );
  });

  it('oculta links administrativos não permitidos', () => {
    useAuthMock.mockReturnValue({ user: { permissions: [] } });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Papéis e permissões' })).not.toBeInTheDocument();
  });

  it('exibe depósitos somente com permissão de leitura', () => {
    useAuthMock.mockReturnValue({ user: { permissions: [PERMISSIONS.WAREHOUSES_READ] } });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Depósitos e endereços' })).toHaveAttribute(
      'href',
      '/warehouses',
    );
  });

  it('exibe saldos somente com permissão de leitura de estoque', () => {
    useAuthMock.mockReturnValue({ user: { permissions: [PERMISSIONS.INVENTORY_READ] } });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Saldos' })).toHaveAttribute('href', '/inventory');
  });

  it('separa movimentações e inventários por permissão', () => {
    useAuthMock.mockReturnValue({
      user: {
        permissions: [PERMISSIONS.INVENTORY_MOVEMENTS_READ, PERMISSIONS.INVENTORY_COUNTS_READ],
      },
    });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Movimentações' })).toHaveAttribute(
      'href',
      '/inventory/movements',
    );
    expect(screen.getByRole('link', { name: 'Inventários' })).toHaveAttribute(
      'href',
      '/inventory/counts',
    );
  });

  it('exibe pedidos de compra somente com permissão de leitura', () => {
    useAuthMock.mockReturnValue({ user: { permissions: [PERMISSIONS.PURCHASE_ORDERS_READ] } });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Pedidos de compra' })).toHaveAttribute(
      'href',
      '/purchases/orders',
    );
  });

  it('exibe recebimentos somente com permissão própria de leitura', () => {
    useAuthMock.mockReturnValue({ user: { permissions: [PERMISSIONS.PURCHASE_RECEIPTS_READ] } });
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Recebimentos' })).toHaveAttribute(
      'href',
      '/purchases/receipts',
    );
    expect(screen.queryByRole('link', { name: 'Pedidos de compra' })).not.toBeInTheDocument();
  });
});
