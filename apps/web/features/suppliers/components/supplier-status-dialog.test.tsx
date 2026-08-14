import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Supplier } from '../types/supplier.types';
import { SupplierStatusDialog } from './supplier-status-dialog';
const mutateAsync = vi.fn();
vi.mock('../hooks/use-suppliers', () => ({
  useUpdateSupplierStatus: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const supplier = {
  id: '1',
  type: 'COMPANY',
  name: 'Empresa',
  tradeName: null,
  document: '04252011000110',
  email: null,
  phone: null,
  contactName: null,
  notes: null,
  isActive: true,
  address: null,
  createdAt: '',
  updatedAt: '',
} as Supplier;
describe('SupplierStatusDialog', () => {
  it('confirma preservação histórica', async () => {
    mutateAsync.mockResolvedValue({});
    const user = userEvent.setup();
    render(<SupplierStatusDialog supplier={supplier} />);
    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(screen.getByText(/históricos serão preservados/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    expect(mutateAsync).toHaveBeenCalledWith({ id: '1', isActive: false });
  });
});
