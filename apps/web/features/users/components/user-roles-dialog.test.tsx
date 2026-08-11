import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRolesDialog } from './user-roles-dialog';

const mutateAsync = vi.fn();
const refreshSession = vi.fn();
vi.mock('../hooks/use-users', () => ({
  useUpdateUserRoles: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('../../roles/hooks/use-roles', () => ({
  useRoles: () => ({
    data: [
      {
        id: 'role-1',
        name: 'Financeiro',
        description: null,
        permissions: [],
        isSystem: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'role-2',
        name: 'Vendas',
        description: null,
        permissions: [],
        isSystem: false,
        createdAt: '',
        updatedAt: '',
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('../../auth/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, refreshSession }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const targetUser = {
  id: 'user-1',
  name: 'Maria Silva',
  email: 'maria@erp.local',
  isActive: true,
  roles: [{ id: 'role-1', name: 'Financeiro' }],
  createdAt: '',
  updatedAt: '',
};

describe('UserRolesDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    refreshSession.mockReset();
  });

  it('substitui os papéis usando IDs obtidos da API', async () => {
    mutateAsync.mockResolvedValue({});
    refreshSession.mockResolvedValue(undefined);
    const browser = userEvent.setup();
    render(<UserRolesDialog user={targetUser} />);
    await browser.click(screen.getByRole('button', { name: 'Alterar papéis de Maria Silva' }));
    await browser.click(screen.getByRole('checkbox', { name: 'Vendas' }));
    await browser.click(screen.getByRole('button', { name: 'Salvar papéis' }));
    expect(mutateAsync).toHaveBeenCalledWith({ id: targetUser.id, roleIds: ['role-1', 'role-2'] });
    expect(refreshSession).toHaveBeenCalled();
  });
});
