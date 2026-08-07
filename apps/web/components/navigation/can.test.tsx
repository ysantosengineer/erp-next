import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Can } from './can';

const useAuthMock = vi.fn();

vi.mock('../../features/auth/hooks/use-auth', () => ({ useAuth: () => useAuthMock() }));

describe('Can', () => {
  beforeEach(() => useAuthMock.mockReset());

  it('exibe conteúdo quando a permissão atual está presente', () => {
    useAuthMock.mockReturnValue({ user: { permissions: ['users.read'] } });
    render(
      <Can permission="users.read">
        <span>Usuários</span>
      </Can>,
    );

    expect(screen.getByText('Usuários')).toBeVisible();
  });

  it('oculta conteúdo quando a permissão não está presente', () => {
    useAuthMock.mockReturnValue({ user: { permissions: [] } });
    render(
      <Can permission="users.read">
        <span>Usuários</span>
      </Can>,
    );

    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
  });
});
