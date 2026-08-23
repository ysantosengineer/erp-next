import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateInventoryCountDialog } from './create-inventory-count-dialog';

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('../../warehouses/hooks/use-warehouses', () => ({
  useWarehouses: () => ({
    data: {
      data: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          code: 'MAIN',
          name: 'Principal',
          isActive: true,
        },
      ],
    },
  }),
}));
vi.mock('../hooks/use-inventory-counts', () => ({
  useCreateInventoryCount: () => ({ isPending: false, mutateAsync: mocks.create }),
}));

describe('CreateInventoryCountDialog', () => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({ id: 'count-created' });
    mocks.push.mockReset();
  });

  it('cria inventário com depósito e descrição e abre o detalhe', async () => {
    render(<CreateInventoryCountDialog />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo inventário' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Depósito' }));
    await userEvent.click(screen.getByRole('option', { name: 'MAIN · Principal' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Descrição opcional' }), 'Mensal');
    await userEvent.click(screen.getByRole('button', { name: 'Criar inventário' }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        warehouseId: '11111111-1111-4111-8111-111111111111',
        description: 'Mensal',
      }),
    );
    expect(mocks.push).toHaveBeenCalledWith('/inventory/counts/count-created');
  });
});
