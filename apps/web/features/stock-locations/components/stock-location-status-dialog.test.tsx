import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StockLocation } from '../types/stock-location.types';
import { StockLocationStatusDialog } from './stock-location-status-dialog';

const mutateAsync = vi.fn();
vi.mock('../hooks/use-stock-locations', () => ({
  useUpdateStockLocationStatus: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const location = { id: 'l1', code: 'A-01', isActive: true } as StockLocation;

describe('StockLocationStatusDialog', () => {
  it('confirma inativação sem excluir o endereço', async () => {
    mutateAsync.mockResolvedValue({});
    const user = userEvent.setup();
    render(<StockLocationStatusDialog warehouseId="w1" location={location} />);
    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(screen.getByText(/não será excluído/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(mutateAsync).toHaveBeenCalledWith({ id: 'l1', isActive: false });
  });
  it('oferece reativação', () => {
    render(
      <StockLocationStatusDialog warehouseId="w1" location={{ ...location, isActive: false }} />,
    );
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeVisible();
  });
});
