import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserStatusDialog } from './user-status-dialog';

const mutateAsync = vi.fn();
vi.mock('../hooks/use-users', () => ({
  useUpdateUserStatus: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const targetUser = {
  id: 'user-1',
  name: 'Maria Silva',
  email: 'maria@erp.local',
  isActive: true,
  roles: [],
  createdAt: '',
  updatedAt: '',
};

describe('UserStatusDialog', () => {
  beforeEach(() => mutateAsync.mockReset());

  it('solicita confirmação antes de inativar', async () => {
    mutateAsync.mockResolvedValue({});
    const browser = userEvent.setup();
    render(<UserStatusDialog isCurrentUser={false} user={targetUser} />);
    await browser.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(screen.getByText('Inativar Maria Silva?')).toBeVisible();
    expect(mutateAsync).not.toHaveBeenCalled();
    await browser.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(mutateAsync).toHaveBeenCalledWith({ id: targetUser.id, isActive: false });
  });

  it('bloqueia visualmente a auto-inativação', () => {
    render(<UserStatusDialog isCurrentUser user={targetUser} />);
    expect(screen.getByRole('button', { name: 'Inativar' })).toBeDisabled();
  });
});
