import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolePermissionsDialog } from './role-permissions-dialog';

const mutateAsync = vi.fn();
const refreshSession = vi.fn();
vi.mock('../hooks/use-roles', () => ({
  usePermissionCatalog: () => ({
    data: [
      {
        id: 'permission-1',
        code: 'users.read',
        resource: 'users',
        action: 'read',
        description: 'Consulta usuários.',
      },
      {
        id: 'permission-2',
        code: 'roles.read',
        resource: 'roles',
        action: 'read',
        description: 'Consulta papéis.',
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useUpdateRolePermissions: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('../../auth/hooks/use-auth', () => ({ useAuth: () => ({ refreshSession }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const role = {
  id: 'role-1',
  name: 'Financeiro',
  description: null,
  isSystem: false,
  permissions: [{ id: 'permission-1', code: 'users.read', description: 'Consulta usuários.' }],
  createdAt: '',
  updatedAt: '',
};

describe('RolePermissionsDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    refreshSession.mockReset();
  });

  it('organiza o catálogo por módulo e substitui permissões', async () => {
    mutateAsync.mockResolvedValue({});
    refreshSession.mockResolvedValue(undefined);
    const browser = userEvent.setup();
    render(<RolePermissionsDialog role={role} />);
    await browser.click(screen.getByRole('button', { name: 'Gerenciar permissões de Financeiro' }));
    expect(screen.getByText('Usuários')).toBeVisible();
    expect(screen.getByText('Papéis')).toBeVisible();
    await browser.click(screen.getByRole('checkbox', { name: /Visualizar papéis/ }));
    await browser.click(screen.getByRole('button', { name: 'Salvar permissões' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      id: role.id,
      permissionIds: ['permission-1', 'permission-2'],
    });
    expect(refreshSession).toHaveBeenCalled();
  });

  it('impede remover permissões essenciais do papel do sistema', async () => {
    const browser = userEvent.setup();
    render(<RolePermissionsDialog role={{ ...role, isSystem: true }} />);
    await browser.click(screen.getByRole('button', { name: 'Gerenciar permissões de Financeiro' }));
    expect(screen.getByRole('checkbox', { name: /Visualizar usuários/ })).toBeDisabled();
  });
});
