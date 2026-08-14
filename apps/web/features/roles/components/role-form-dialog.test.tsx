import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleFormDialog } from './role-form-dialog';

const createAsync = vi.fn();
const updateAsync = vi.fn();
vi.mock('../hooks/use-roles', () => ({
  useCreateRole: () => ({ mutateAsync: createAsync, isPending: false }),
  useUpdateRole: () => ({ mutateAsync: updateAsync, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('RoleFormDialog', () => {
  beforeEach(() => {
    createAsync.mockReset();
    updateAsync.mockReset();
  });

  it('cria papel sem atribuir permissões implicitamente', async () => {
    createAsync.mockResolvedValue({});
    const browser = userEvent.setup();
    render(<RoleFormDialog />);
    await browser.click(screen.getByRole('button', { name: 'Novo papel' }));
    await browser.type(screen.getByLabelText('Nome'), 'Financeiro');
    await browser.type(screen.getByLabelText('Descrição'), 'Acesso financeiro.');
    await browser.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createAsync).toHaveBeenCalledWith({
      name: 'Financeiro',
      description: 'Acesso financeiro.',
      permissionIds: [],
    });
  });

  it('edita descrição e protege o nome de papel do sistema', async () => {
    updateAsync.mockResolvedValue({});
    const browser = userEvent.setup();
    const role = {
      id: 'role-1',
      name: 'Administrator',
      description: 'Sistema.',
      isSystem: true,
      permissions: [],
      createdAt: '',
      updatedAt: '',
    };
    render(<RoleFormDialog role={role} />);
    await browser.click(screen.getByRole('button', { name: 'Editar Administrator' }));
    expect(screen.getByLabelText('Nome')).toBeDisabled();
    const description = screen.getByLabelText('Descrição');
    await browser.clear(description);
    await browser.type(description, 'Administração protegida.');
    await browser.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(updateAsync).toHaveBeenCalledWith({
      id: role.id,
      input: { name: role.name, description: 'Administração protegida.' },
    });
  });
});
