import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { SuppliersPage } from './suppliers-page';
const query = vi.fn(),
  permissions = new Set<string>();
vi.mock('../hooks/use-suppliers', () => ({ useSuppliers: (p: unknown) => query(p) }));
vi.mock('../../../components/navigation/can', () => ({
  usePermission: (p: string) => permissions.has(p),
}));
vi.mock('./supplier-form-dialog', () => ({
  SupplierFormDialog: () => <button>Novo fornecedor</button>,
}));
vi.mock('./supplier-status-dialog', () => ({
  SupplierStatusDialog: () => <button>Inativar</button>,
}));
describe('SuppliersPage', () => {
  beforeEach(() => {
    permissions.clear();
    query.mockReturnValue({
      data: {
        data: [
          {
            id: '1',
            type: 'COMPANY',
            name: 'Empresa SA',
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
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });
  it('lista documento formatado', () => {
    render(<SuppliersPage />);
    expect(screen.getByText('Empresa SA')).toBeVisible();
    expect(screen.getByText('04.252.011/0001-10')).toBeVisible();
  });
  it('respeita permissão de criação', () => {
    const { rerender } = render(<SuppliersPage />);
    expect(screen.queryByText('Novo fornecedor')).not.toBeInTheDocument();
    permissions.add(PERMISSIONS.SUPPLIERS_CREATE);
    rerender(<SuppliersPage />);
    expect(screen.getByText('Novo fornecedor')).toBeVisible();
  });
});
