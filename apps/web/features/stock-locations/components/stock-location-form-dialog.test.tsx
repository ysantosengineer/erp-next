import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/api-error';
import type { StockLocation } from '../types/stock-location.types';
import { StockLocationFormDialog } from './stock-location-form-dialog';

const create = vi.fn();
const update = vi.fn();
vi.mock('../hooks/use-stock-locations', () => ({
  useCreateStockLocation: () => ({ mutateAsync: create, isPending: false }),
  useUpdateStockLocation: () => ({ mutateAsync: update, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const location = {
  id: 'l1',
  warehouseId: 'w1',
  code: 'A-01',
  description: null,
  zone: 'A',
  aisle: '01',
  rack: null,
  level: null,
  position: null,
  capacity: '100.000',
  isActive: true,
  createdAt: '',
  updatedAt: '',
} as StockLocation;

describe('StockLocationFormDialog', () => {
  beforeEach(() => {
    create.mockReset();
    update.mockReset();
  });
  it('cria endereço com capacidade normalizada', async () => {
    create.mockResolvedValue({});
    const user = userEvent.setup();
    render(<StockLocationFormDialog warehouseId="w1" />);
    await user.click(screen.getByRole('button', { name: 'Novo endereço' }));
    await user.type(screen.getByLabelText('Código'), 'a-02');
    await user.type(screen.getByLabelText('Capacidade'), '10,500');
    await user.click(screen.getByRole('button', { name: 'Salvar endereço' }));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'A-02', capacity: '10.500' }),
    );
  });
  it('impede capacidade negativa no cliente', async () => {
    const user = userEvent.setup();
    render(<StockLocationFormDialog warehouseId="w1" />);
    await user.click(screen.getByRole('button', { name: 'Novo endereço' }));
    await user.type(screen.getByLabelText('Código'), 'A-02');
    await user.type(screen.getByLabelText('Capacidade'), '-1');
    await user.click(screen.getByRole('button', { name: 'Salvar endereço' }));
    expect(await screen.findByText(/capacidade não negativa/i)).toBeVisible();
    expect(create).not.toHaveBeenCalled();
  });
  it('exibe duplicidade junto ao código', async () => {
    create.mockRejectedValue(new ApiError(409, { code: 'STOCK_LOCATION_CODE_EXISTS' }));
    const user = userEvent.setup();
    render(<StockLocationFormDialog warehouseId="w1" />);
    await user.click(screen.getByRole('button', { name: 'Novo endereço' }));
    await user.type(screen.getByLabelText('Código'), 'A-02');
    await user.click(screen.getByRole('button', { name: 'Salvar endereço' }));
    expect(await screen.findByText(/código já está em uso/i)).toBeVisible();
  });
  it('edita endereço existente', async () => {
    update.mockResolvedValue({});
    const user = userEvent.setup();
    render(<StockLocationFormDialog warehouseId="w1" location={location} />);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.clear(screen.getByLabelText('Zona'));
    await user.type(screen.getByLabelText('Zona'), 'B');
    await user.click(screen.getByRole('button', { name: 'Salvar endereço' }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'l1', input: expect.objectContaining({ zone: 'B' }) }),
    );
  });
});
