import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/api-error';
import type { Warehouse } from '../types/warehouse.types';
import { WarehouseFormDialog } from './warehouse-form-dialog';

const create = vi.fn();
const update = vi.fn();
vi.mock('../hooks/use-warehouses', () => ({
  useCreateWarehouse: () => ({ mutateAsync: create, isPending: false }),
  useUpdateWarehouse: () => ({ mutateAsync: update, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const warehouse = {
  id: 'w1',
  name: 'Principal',
  code: 'MAIN',
  description: 'Geral',
  isActive: true,
  locationCount: 0,
  createdAt: '',
  updatedAt: '',
} as Warehouse;

describe('WarehouseFormDialog', () => {
  beforeEach(() => {
    create.mockReset();
    update.mockReset();
  });
  it('cria depósito normalizado', async () => {
    create.mockResolvedValue({});
    const user = userEvent.setup();
    render(<WarehouseFormDialog />);
    await user.click(screen.getByRole('button', { name: 'Novo depósito' }));
    await user.type(screen.getByLabelText('Nome'), 'Secundário');
    await user.type(screen.getByLabelText('Código'), 'sec');
    await user.click(screen.getByRole('button', { name: 'Salvar depósito' }));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Secundário', code: 'SEC' }),
    );
  });
  it('exibe duplicidade junto ao código', async () => {
    create.mockRejectedValue(new ApiError(409, { code: 'WAREHOUSE_CODE_EXISTS' }));
    const user = userEvent.setup();
    render(<WarehouseFormDialog />);
    await user.click(screen.getByRole('button', { name: 'Novo depósito' }));
    await user.type(screen.getByLabelText('Nome'), 'Secundário');
    await user.type(screen.getByLabelText('Código'), 'SEC');
    await user.click(screen.getByRole('button', { name: 'Salvar depósito' }));
    expect(await screen.findByText(/código já está em uso/i)).toBeVisible();
  });
  it('edita depósito existente', async () => {
    update.mockResolvedValue({});
    const user = userEvent.setup();
    render(<WarehouseFormDialog warehouse={warehouse} />);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Principal novo');
    await user.click(screen.getByRole('button', { name: 'Salvar depósito' }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'w1',
        input: expect.objectContaining({ name: 'Principal novo' }),
      }),
    );
  });
});
