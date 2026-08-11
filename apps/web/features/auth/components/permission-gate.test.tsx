import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { PermissionGate } from './permission-gate';

const useAuthMock = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));
vi.mock('../hooks/use-auth', () => ({ useAuth: () => useAuthMock() }));

describe('PermissionGate', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
  });

  it('permite /users com users.read', () => {
    useAuthMock.mockReturnValue({ user: { permissions: [PERMISSIONS.USERS_READ] } });
    render(
      <PermissionGate permission={PERMISSIONS.USERS_READ}>
        <p>Gestão de usuários</p>
      </PermissionGate>,
    );
    expect(screen.getByText('Gestão de usuários')).toBeVisible();
  });

  it('bloqueia /users sem users.read', async () => {
    useAuthMock.mockReturnValue({ user: { permissions: [] } });
    render(
      <PermissionGate permission={PERMISSIONS.USERS_READ}>
        <p>Gestão de usuários</p>
      </PermissionGate>,
    );
    expect(screen.queryByText('Gestão de usuários')).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/unauthorized'));
  });

  it('bloqueia /roles sem roles.read', async () => {
    useAuthMock.mockReturnValue({ user: { permissions: [] } });
    render(
      <PermissionGate permission={PERMISSIONS.ROLES_READ}>
        <p>Gestão de papéis</p>
      </PermissionGate>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/unauthorized'));
  });
});
