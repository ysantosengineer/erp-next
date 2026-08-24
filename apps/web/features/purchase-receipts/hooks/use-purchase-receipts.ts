'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryQueryKeys } from '../../inventory/hooks/use-inventory';
import { purchaseOrderKeys } from '../../purchase-orders/hooks/use-purchase-orders';
import { purchaseReceiptsService } from '../services/purchase-receipts.service';
import type { PurchaseReceiptFilters } from '../types/purchase-receipt.types';

export const purchaseReceiptKeys = {
  all: ['purchase-receipts'] as const,
  list: (filters: PurchaseReceiptFilters) => ['purchase-receipts', 'list', filters] as const,
  detail: (id: string) => ['purchase-receipts', 'detail', id] as const,
  options: ['purchase-receipts', 'options'] as const,
  receivable: (orderId: string) => ['purchase-order-receivable', orderId] as const,
};

export const usePurchaseReceipts = (filters: PurchaseReceiptFilters) =>
  useQuery({
    queryKey: purchaseReceiptKeys.list(filters),
    queryFn: () => purchaseReceiptsService.list(filters),
  });

export const usePurchaseReceiptOptions = () =>
  useQuery({
    queryKey: purchaseReceiptKeys.options,
    queryFn: purchaseReceiptsService.options,
    staleTime: 60_000,
  });

export const usePurchaseReceipt = (id: string) =>
  useQuery({
    queryKey: purchaseReceiptKeys.detail(id),
    queryFn: () => purchaseReceiptsService.detail(id),
    enabled: Boolean(id),
  });

export const usePurchaseReceiptsByOrder = (orderId: string, enabled: boolean) =>
  useQuery({
    queryKey: purchaseReceiptKeys.list({
      page: 1,
      limit: 100,
      purchaseOrderId: orderId,
      sortBy: 'receivedAt',
      sortOrder: 'desc',
    }),
    queryFn: () =>
      purchaseReceiptsService.list({
        page: 1,
        limit: 100,
        purchaseOrderId: orderId,
        sortBy: 'receivedAt',
        sortOrder: 'desc',
      }),
    enabled: Boolean(orderId) && enabled,
  });

export const useReceivablePurchaseOrder = (orderId: string) =>
  useQuery({
    queryKey: purchaseReceiptKeys.receivable(orderId),
    queryFn: () => purchaseReceiptsService.receivable(orderId),
    enabled: Boolean(orderId),
  });

export function useCreatePurchaseReceipt() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: purchaseReceiptsService.create,
    onSuccess: (receipt) =>
      Promise.all([
        client.invalidateQueries({ queryKey: purchaseReceiptKeys.all }),
        client.invalidateQueries({
          queryKey: purchaseReceiptKeys.receivable(receipt.purchaseOrder.id),
        }),
        client.invalidateQueries({ queryKey: purchaseOrderKeys.all }),
        client.invalidateQueries({ queryKey: purchaseOrderKeys.detail(receipt.purchaseOrder.id) }),
        client.invalidateQueries({ queryKey: inventoryQueryKeys.balanceRoot }),
        client.invalidateQueries({ queryKey: inventoryQueryKeys.movementRoot }),
        ...receipt.items.map((item) =>
          client.invalidateQueries({ queryKey: inventoryQueryKeys.product(item.product.id) }),
        ),
      ]),
  });
}
