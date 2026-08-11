import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { UsersPage } from './users-page';

const useUsersMock = vi.fn();
const permissionSet = new Set<string>();

vi.mock('../hooks/use-users', () => ({ useUsers: (params: unknown) => useUsersMock(params) }));
vi.mock('../../../components/navigation/can', () => ({
  usePermission: (permission: string) => permissionSet.has(permission),
}));
vi.mock('../../auth/hooks/use-auth', () => ({ useAuth: () => ({ user: { id: 'user-current' } }) }));
vi.mock('./create-user-dialog', () => ({
  CreateUserDialog: () => <button type="button">Novo usuário</button>,
}));
vi.mock('./edit-user-dialog', () => ({
  EditUserDialog: () => <button type="button">Editar</button>,
}));
vi.mock('./user-roles-dialog', () => ({
  UserRolesDialog: () => <button type="button">Papéis</button>,
}));
vi.mock('./user-status-dialog', () => ({
  UserStatusDialog: () => <button type="button">Inativar</button>,
}));

const user = {
  id: 'user-1',
  name: 'Maria Silva',
  email: 'maria@erp.local',
  isActive: true,
  roles: [{ id: 'role-1', name: 'Financeiro' }],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};
const successResult = {
  data: { data: [user], meta: { page: 1, limit: 20, total: 21, totalPages: 2 } },
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

describe('UsersPage', () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    permissionSet.clear();
    permissionSet.add(PERMISSIONS.USERS_READ);
    useUsersMock.mockReset();
    useUsersMock.mockReturnValue(successResult);
  });

  it('lista usuários e informações seguras retornadas pela API', () => {
    render(<UsersPage />);
    expect(screen.getByText('Maria Silva')).toBeVisible();
    expect(screen.getByText('maria@erp.local')).toBeVisible();
    expect(screen.getByText('Financeiro')).toBeVisible();
    expect(screen.getByText('Ativo')).toBeVisible();
  });

  it('exibe loading e estado vazio', () => {
    useUsersMock.mockReturnValueOnce({ ...successResult, data: undefined, isLoading: true });
    const { rerender } = render(<UsersPage />);
    expect(screen.getByTestId('users-loading')).toBeInTheDocument();
    useUsersMock.mockReturnValue({
      ...successResult,
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });
    rerender(<UsersPage />);
    expect(screen.getByText('Nenhum usuário encontrado')).toBeVisible();
  });

  it('exibe erro seguro e permite tentar novamente', () => {
    const refetch = vi.fn();
    useUsersMock.mockReturnValue({
      ...successResult,
      data: undefined,
      isError: true,
      error: new Error('internal detail'),
      refetch,
    });
    render(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os usuários.');
    expect(refetch).toHaveBeenCalled();
  });

  it('aplica pesquisa no servidor após debounce e retorna à página 1', () => {
    vi.useFakeTimers();
    render(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Maria' } });
    act(() => vi.advanceTimersByTime(350));
    expect(useUsersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: 'Maria' }),
    );
  });

  it('preserva pesquisa ao alterar o filtro de status', async () => {
    const userEventApi = userEvent.setup();
    render(<UsersPage />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Maria' } });
    await new Promise((resolve) => window.setTimeout(resolve, 360));
    await userEventApi.click(screen.getByRole('combobox', { name: 'Filtrar por status' }));
    await userEventApi.click(screen.getByRole('option', { name: 'Inativos' }));
    await waitFor(() =>
      expect(useUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'Maria', status: 'inactive' }),
      ),
    );
  });

  it('pagina usando metadados reais da API', async () => {
    render(<UsersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(useUsersMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 20 }));
  });

  it('mostra ações somente com as permissões correspondentes', () => {
    const { rerender } = render(<UsersPage />);
    expect(screen.queryByRole('button', { name: 'Novo usuário' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();

    permissionSet.add(PERMISSIONS.USERS_CREATE);
    permissionSet.add(PERMISSIONS.USERS_UPDATE);
    permissionSet.add(PERMISSIONS.USERS_MANAGE_STATUS);
    permissionSet.add(PERMISSIONS.USERS_MANAGE_ROLES);
    permissionSet.add(PERMISSIONS.ROLES_READ);
    rerender(<UsersPage />);

    expect(screen.getByRole('button', { name: 'Novo usuário' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Papéis' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Inativar' })).toBeVisible();
  });
});
