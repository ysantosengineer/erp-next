import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Warehouse } from '../types/warehouse.types';
import { WarehouseStatusDialog } from './warehouse-status-dialog';

const mutateAsync = vi.fn();
vi.mock('../hooks/use-warehouses', () => ({
  useUpdateWarehouseStatus: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const warehouse = { id: 'w1', name: 'Principal', isActive: true } as Warehouse;

describe('WarehouseStatusDialog', () => {
  it('confirma inativação explicando integridade dos endereços', async () => {
    mutateAsync.mockResolvedValue({});
    const user = userEvent.setup();
    render(<WarehouseStatusDialog warehouse={warehouse} />);
    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(screen.getByText(/endereços ativos precisam ser inativados/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(mutateAsync).toHaveBeenCalledWith({ id: 'w1', isActive: false });
  });
  it('oferece reativação', () => {
    render(<WarehouseStatusDialog warehouse={{ ...warehouse, isActive: false }} />);
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeVisible();
  });
});
