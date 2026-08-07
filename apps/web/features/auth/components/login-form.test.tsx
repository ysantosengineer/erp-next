import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/api-error';
import { LoginForm } from './login-form';

const loginMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));
vi.mock('../hooks/use-auth', () => ({ useAuth: () => ({ login: loginMock }) }));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({ replace: replaceMock } as unknown as ReturnType<
      typeof useRouter
    >);
    loginMock.mockReset();
    replaceMock.mockReset();
  });

  it('mostra erros de validação sem enviar credenciais inválidas', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe o e-mail.')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('envia credenciais válidas e redireciona ao dashboard', async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'admin@erp.local');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura-com-12-caracteres');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(loginMock).toHaveBeenCalledWith({
      email: 'admin@erp.local',
      password: 'senha-segura-com-12-caracteres',
    });
    expect(replaceMock).toHaveBeenCalledWith('/');
  });

  it('exibe mensagem segura para credenciais recusadas', async () => {
    loginMock.mockRejectedValue(
      new ApiError(401, { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas.' }),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'admin@erp.local');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura-com-12-caracteres');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  });

  it('bloqueia múltiplos envios enquanto o login está em andamento', async () => {
    let finishLogin: (() => void) | undefined;
    loginMock.mockReturnValue(
      new Promise<void>((resolve) => {
        finishLogin = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'admin@erp.local');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura-com-12-caracteres');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Entrando…' }));
    expect(loginMock).toHaveBeenCalledTimes(1);

    finishLogin?.();
  });
});
