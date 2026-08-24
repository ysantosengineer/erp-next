import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { ReportsIndexPage } from './reports-index-page';

vi.mock('../../auth/hooks/use-auth', () => ({
  useAuth: () => ({ user: { permissions: [PERMISSIONS.SALES_ORDERS_READ] } }),
}));

describe('ReportsIndexPage', () => {
  it('lista somente relatórios autorizados', () => {
    render(<ReportsIndexPage />);
    expect(screen.getByRole('link', { name: /Vendas/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Financeiro/ })).not.toBeInTheDocument();
  });
});
