import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { RolesPage } from './roles-page';

const useRolesMock = vi.fn();
const permissionSet = new Set<string>();
vi.mock('../hooks/use-roles', () => ({ useRoles: () => useRolesMock() }));
vi.mock('../../../components/navigation/can', () => ({
  usePermission: (permission: string) => permissionSet.has(permission),
}));
vi.mock('./role-form-dialog', () => ({
  RoleFormDialog: ({ role }: { role?: { name: string } }) => (
    <button type="button">{role ? `Editar ${role.name}` : 'Novo papel'}</button>
  ),
}));
vi.mock('./role-permissions-dialog', () => ({
  RolePermissionsDialog: ({ role }: { role: { name: string } }) => (
    <button type="button">Permissões de {role.name}</button>
  ),
}));
vi.mock('./delete-role-dialog', () => ({
  DeleteRoleDialog: ({ role }: { role: { name: string } }) => (
    <button type="button">Excluir {role.name}</button>
  ),
}));

const role = {
  id: 'role-1',
  name: 'Financeiro',
  description: 'Acesso financeiro.',
  isSystem: false,
  permissions: [{ id: 'permission-1', code: 'users.read', description: null }],
  createdAt: '',
  updatedAt: '',
};
const successResult = {
  data: [role],
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

describe('RolesPage', () => {
  beforeEach(() => {
    permissionSet.clear();
    useRolesMock.mockReset();
    useRolesMock.mockReturnValue(successResult);
  });

  it('lista papéis e quantidade real de permissões', () => {
    render(<RolesPage />);
    expect(screen.getByText('Financeiro')).toBeVisible();
    expect(screen.getByText('1 permissão')).toBeVisible();
    expect(screen.getByText('Personalizado')).toBeVisible();
  });

  it('trata loading e estado vazio', () => {
    useRolesMock.mockReturnValueOnce({ ...successResult, data: undefined, isLoading: true });
    const { rerender } = render(<RolesPage />);
    expect(screen.getByTestId('roles-loading')).toBeInTheDocument();
    useRolesMock.mockReturnValue({ ...successResult, data: [] });
    rerender(<RolesPage />);
    expect(screen.getByText('Nenhum papel cadastrado')).toBeVisible();
  });

  it('exibe erro seguro e permite tentar novamente', () => {
    const refetch = vi.fn();
    useRolesMock.mockReturnValue({
      ...successResult,
      data: undefined,
      isError: true,
      error: new Error('internal detail'),
      refetch,
    });
    render(<RolesPage />);
    screen.getByRole('button', { name: 'Tentar novamente' }).click();
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os papéis.');
    expect(refetch).toHaveBeenCalled();
  });

  it('mostra criação, edição, exclusão e permissões conforme autorização', () => {
    const { rerender } = render(<RolesPage />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    permissionSet.add(PERMISSIONS.ROLES_CREATE);
    permissionSet.add(PERMISSIONS.ROLES_UPDATE);
    permissionSet.add(PERMISSIONS.ROLES_DELETE);
    permissionSet.add(PERMISSIONS.ROLES_MANAGE_PERMISSIONS);
    rerender(<RolesPage />);
    expect(screen.getByRole('button', { name: 'Novo papel' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Editar Financeiro' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Excluir Financeiro' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Permissões de Financeiro' })).toBeVisible();
  });
});
