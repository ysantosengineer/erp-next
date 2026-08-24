import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../lib/permissions/permissions';
import { InventoryCountDetailPage } from './inventory-count-detail-page';

const permissions = new Set<string>();
const queryMock = vi.fn();
const submitCount = vi.fn();
const submitRecount = vi.fn();
const requestRecount = vi.fn();
const approve = vi.fn();
const cancel = vi.fn();
vi.mock('../../../components/navigation/can', () => ({
  usePermission: (permission: string) => permissions.has(permission),
}));
vi.mock('../hooks/use-inventory-counts', () => ({
  useInventoryCount: (...args: unknown[]) => queryMock(...args),
  useStartInventoryCount: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useRequestInventoryRecount: () => ({ isPending: false, mutateAsync: requestRecount }),
  useApproveInventoryCount: () => ({ isPending: false, mutateAsync: approve }),
  useCancelInventoryCount: () => ({ isPending: false, mutateAsync: cancel }),
  useSubmitInventoryCountItem: () => ({ isPending: false, mutateAsync: submitCount }),
  useSubmitInventoryRecount: () => ({ isPending: false, mutateAsync: submitRecount }),
  useAddInventoryCountItem: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useInventoryCountOptions: () => ({ data: { products: [], locations: [] } }),
}));

const detail = {
  id: 'count-1',
  status: 'IN_PROGRESS',
  description: 'Contagem mensal',
  warehouse: { id: 'warehouse', name: 'Principal', code: 'MAIN', isActive: true },
  createdBy: { id: 'user', name: 'Yuri', email: 'yuri@example.test' },
  approvedBy: null,
  cancelledBy: null,
  summary: {
    totalItems: 1,
    countedItems: 0,
    divergentItems: 0,
    recountPendingItems: 0,
    positiveDifferences: 0,
    negativeDifferences: 0,
  },
  startedAt: '2026-08-23T12:00:00Z',
  completedAt: null,
  approvedAt: null,
  cancelledAt: null,
  createdAt: '2026-08-23T12:00:00Z',
  updatedAt: '2026-08-23T12:00:00Z',
  items: {
    data: [
      {
        id: 'item-1',
        product: { id: 'product', name: 'Café', sku: 'CAF-1', unit: { symbol: 'UN' } },
        location: { id: 'location', code: 'A-01' },
        systemQuantity: '10.0000',
        firstCountQuantity: null,
        recountQuantity: null,
        finalCountQuantity: null,
        differenceQuantity: null,
        countedBy: null,
        recountedBy: null,
        countedAt: null,
        recountedAt: null,
        status: 'COUNT_PENDING',
      },
    ],
    meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
  },
  movements: [],
};

describe('InventoryCountDetailPage', () => {
  beforeEach(() => {
    permissions.clear();
    queryMock
      .mockReset()
      .mockReturnValue({ isLoading: false, isError: false, data: detail, refetch: vi.fn() });
    submitCount.mockReset().mockResolvedValue({});
    submitRecount.mockReset().mockResolvedValue({});
    requestRecount.mockReset().mockResolvedValue({});
    approve.mockReset().mockResolvedValue({});
    cancel.mockReset().mockResolvedValue({});
  });

  it('permite contagem inline por teclado e mostra progresso', async () => {
    permissions.add(PERMISSIONS.INVENTORY_COUNTS_COUNT);
    render(<InventoryCountDetailPage id="count-1" />);
    const input = screen.getByRole('textbox', { name: 'Primeira contagem de Café' });
    await userEvent.type(input, '8,5');
    fireEvent.submit(input.closest('form')!);
    expect(submitCount).toHaveBeenCalledWith({
      id: 'count-1',
      itemId: 'item-1',
      input: { quantity: '8.5' },
    });
    expect(screen.getByText('0/1 itens · 0%')).toBeInTheDocument();
  });

  it('bloqueia aprovação incompleta e confirma aprovação quando pronta', async () => {
    permissions.add(PERMISSIONS.INVENTORY_COUNTS_APPROVE);
    const { rerender } = render(<InventoryCountDetailPage id="count-1" />);
    expect(screen.queryByRole('button', { name: 'Aprovar inventário' })).not.toBeInTheDocument();
    queryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        ...detail,
        status: 'READY_FOR_APPROVAL',
        summary: { ...detail.summary, countedItems: 1 },
        items: {
          ...detail.items,
          data: [
            {
              ...detail.items.data[0],
              firstCountQuantity: '10.0000',
              finalCountQuantity: '10.0000',
              differenceQuantity: '0.0000',
              status: 'MATCHED',
            },
          ],
        },
      },
      refetch: vi.fn(),
    });
    rerender(<InventoryCountDetailPage id="count-1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Aprovar inventário' }));
    expect(screen.getByText('Gerar ajustes e aprovar?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(approve).toHaveBeenCalledWith({ id: 'count-1' });
  });

  it('registra recontagem e confirma cancelamento conforme permissões', async () => {
    permissions.add(PERMISSIONS.INVENTORY_COUNTS_RECOUNT);
    permissions.add(PERMISSIONS.INVENTORY_COUNTS_CANCEL);
    queryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        ...detail,
        status: 'RECOUNT_REQUIRED',
        summary: { ...detail.summary, countedItems: 1, divergentItems: 1, recountPendingItems: 1 },
        items: {
          ...detail.items,
          data: [
            {
              ...detail.items.data[0],
              firstCountQuantity: '8.0000',
              status: 'RECOUNT_PENDING',
            },
          ],
        },
      },
      refetch: vi.fn(),
    });
    render(<InventoryCountDetailPage id="count-1" />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Recontagem de Café' }), '9');
    fireEvent.submit(screen.getByRole('textbox', { name: 'Recontagem de Café' }).closest('form')!);
    expect(submitRecount).toHaveBeenCalledWith({
      id: 'count-1',
      itemId: 'item-1',
      input: { quantity: '9' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Cancelar inventário?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(cancel).toHaveBeenCalledWith({ id: 'count-1' });
  });

  it('renderiza loading e erro', () => {
    queryMock.mockReturnValueOnce({ isLoading: true, isError: false, data: undefined });
    const { rerender } = render(<InventoryCountDetailPage id="count-1" />);
    expect(screen.getByTestId('inventory-count-loading')).toBeInTheDocument();
    queryMock.mockReturnValueOnce({ isLoading: false, isError: true, error: new Error('fail') });
    rerender(<InventoryCountDetailPage id="count-1" />);
    expect(screen.getByText('Não foi possível carregar o inventário.')).toBeInTheDocument();
  });
});
