import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/api-error';
import { CreateUserDialog } from './create-user-dialog';

const { mutateAsync, toastSuccess } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('../hooks/use-users', () => ({ useCreateUser: () => ({ mutateAsync, isPending: false }) }));
vi.mock('../../roles/hooks/use-roles', () => ({
  useRoles: () => ({
    data: [
      {
        id: '30000000-0000-4000-8000-000000000001',
        name: 'Financeiro',
        description: 'Acesso financeiro.',
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
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: vi.fn() } }));

describe('CreateUserDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    toastSuccess.mockReset();
  });

  it('cadastra usuário válido com senha inicial e papel selecionado', async () => {
    mutateAsync.mockResolvedValue({});
    const browser = userEvent.setup();
    render(<CreateUserDialog canAssignRoles />);

    await browser.click(screen.getByRole('button', { name: 'Novo usuário' }));
    await browser.type(screen.getByLabelText('Nome'), 'Maria Silva');
    await browser.type(screen.getByLabelText('E-mail'), 'maria@erp.local');
    await browser.type(screen.getByLabelText('Senha inicial'), 'senha-inicial-segura');
    await browser.click(screen.getByRole('checkbox', { name: /Financeiro/ }));
    await browser.click(screen.getByRole('button', { name: 'Criar usuário' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'Maria Silva',
      email: 'maria@erp.local',
      password: 'senha-inicial-segura',
      roleIds: ['30000000-0000-4000-8000-000000000001'],
    });
    expect(toastSuccess).toHaveBeenCalledWith('Usuário criado com sucesso.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await browser.click(screen.getByRole('button', { name: 'Novo usuário' }));
    expect(screen.getByLabelText('Senha inicial')).toHaveValue('');
  });

  it('associa erro de e-mail duplicado ao campo', async () => {
    mutateAsync.mockRejectedValue(new ApiError(409, { code: 'EMAIL_ALREADY_EXISTS' }));
    const browser = userEvent.setup();
    render(<CreateUserDialog canAssignRoles={false} />);

    await browser.click(screen.getByRole('button', { name: 'Novo usuário' }));
    await browser.type(screen.getByLabelText('Nome'), 'Maria Silva');
    await browser.type(screen.getByLabelText('E-mail'), 'maria@erp.local');
    await browser.type(screen.getByLabelText('Senha inicial'), 'senha-inicial-segura');
    await browser.click(screen.getByRole('button', { name: 'Criar usuário' }));

    expect(await screen.findByText('Este e-mail já está sendo utilizado.')).toBeVisible();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('permite mostrar e ocultar a senha sem persistir seu valor', async () => {
    const browser = userEvent.setup();
    render(<CreateUserDialog canAssignRoles={false} />);
    await browser.click(screen.getByRole('button', { name: 'Novo usuário' }));
    const password = screen.getByLabelText('Senha inicial');
    expect(password).toHaveAttribute('type', 'password');
    await browser.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(password).toHaveAttribute('type', 'text');
  });
});
