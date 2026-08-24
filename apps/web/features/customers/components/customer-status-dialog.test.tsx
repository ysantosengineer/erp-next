import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Customer } from '../types/customer.types';
import { CustomerStatusDialog } from './customer-status-dialog';

const mutateAsync = vi.fn();
vi.mock('../hooks/use-customers', () => ({
  useUpdateCustomerStatus: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const customer = {
  id: '1',
  type: 'INDIVIDUAL',
  name: 'Maria',
  tradeName: null,
  document: '52998224725',
  email: null,
  phone: null,
  creditLimit: '0.00',
  notes: null,
  isActive: true,
  address: null,
  createdAt: '',
  updatedAt: '',
} as Customer;

describe('CustomerStatusDialog', () => {
  it('confirma inativação preservando histórico', async () => {
    mutateAsync.mockResolvedValue({});
    const user = userEvent.setup();
    render(<CustomerStatusDialog customer={customer} />);
    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(screen.getByText(/histórico será preservado/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(mutateAsync).toHaveBeenCalledWith({ id: '1', isActive: false });
  });

  it('oferece reativação para cliente inativo', () => {
    render(<CustomerStatusDialog customer={{ ...customer, isActive: false }} />);
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeVisible();
  });
});
