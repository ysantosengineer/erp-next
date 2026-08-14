import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/api-error';
import { DeleteRoleDialog } from './delete-role-dialog';

const { mutateAsync, toastError } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock('../hooks/use-roles', () => ({ useDeleteRole: () => ({ mutateAsync, isPending: false }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));

const role = {
  id: 'role-1',
  name: 'Vendedor',
  description: null,
  isSystem: false,
  permissions: [],
  createdAt: '',
  updatedAt: '',
};

describe('DeleteRoleDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    toastError.mockReset();
  });

  it('exige confirmação antes da exclusão', async () => {
    mutateAsync.mockResolvedValue(undefined);
    const browser = userEvent.setup();
    render(<DeleteRoleDialog role={role} />);
    await browser.click(screen.getByRole('button', { name: 'Excluir Vendedor' }));
    expect(screen.getByText('Excluir papel “Vendedor”?')).toBeVisible();
    expect(mutateAsync).not.toHaveBeenCalled();
    await browser.click(screen.getByRole('button', { name: 'Excluir papel' }));
    expect(mutateAsync).toHaveBeenCalledWith(role.id);
  });

  it('apresenta erro compreensível para papel em uso', async () => {
    mutateAsync.mockRejectedValue(new ApiError(409, { code: 'ROLE_IN_USE' }));
    const browser = userEvent.setup();
    render(<DeleteRoleDialog role={role} />);
    await browser.click(screen.getByRole('button', { name: 'Excluir Vendedor' }));
    await browser.click(screen.getByRole('button', { name: 'Excluir papel' }));
    expect(toastError).toHaveBeenCalledWith(
      'Este papel está atribuído a usuários e não pode ser excluído.',
    );
  });

  it('não oferece exclusão para papel protegido', () => {
    const { container } = render(<DeleteRoleDialog role={{ ...role, isSystem: true }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
