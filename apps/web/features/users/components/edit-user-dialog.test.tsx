import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditUserDialog } from './edit-user-dialog';

const mutateAsync = vi.fn();
vi.mock('../hooks/use-users', () => ({ useUpdateUser: () => ({ mutateAsync, isPending: false }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const targetUser = {
  id: '40000000-0000-4000-8000-000000000001',
  name: 'Maria Silva',
  email: 'maria@erp.local',
  isActive: true,
  roles: [],
  createdAt: '',
  updatedAt: '',
};

describe('EditUserDialog', () => {
  beforeEach(() => mutateAsync.mockReset());

  it('edita somente nome e e-mail', async () => {
    mutateAsync.mockResolvedValue({});
    const browser = userEvent.setup();
    render(<EditUserDialog user={targetUser} />);
    await browser.click(screen.getByRole('button', { name: 'Editar Maria Silva' }));
    const name = screen.getByLabelText('Nome');
    await browser.clear(name);
    await browser.type(name, 'Maria Souza');
    await browser.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      id: targetUser.id,
      input: { name: 'Maria Souza', email: targetUser.email },
    });
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
  });
});
