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
});
