'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../services/inventory.service';
import type {
  AdjustmentInput,
  BalanceParams,
  EntryInput,
  ExitInput,
  MovementParams,
  ReservationParams,
  TransferInput,
} from '../types/inventory.types';

export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  balanceRoot: ['inventory', 'balances'] as const,
  balances: (params: BalanceParams) => ['inventory', 'balances', params] as const,
  movementRoot: ['inventory', 'movements'] as const,
  movements: (params: MovementParams) => ['inventory', 'movements', params] as const,
  options: ['inventory', 'options'] as const,
  product: (id: string) => ['inventory', 'product', id] as const,
  productRoot: ['inventory', 'product'] as const,
  reservationRoot: ['stock-reservations'] as const,
  reservations: (params: ReservationParams) => ['stock-reservations', params] as const,
};
export const useBalances = (params: BalanceParams) =>
  useQuery({
    queryKey: inventoryQueryKeys.balances(params),
    queryFn: () => inventoryService.getBalances(params),
  });
export const useMovements = (params: MovementParams) =>
  useQuery({
    queryKey: inventoryQueryKeys.movements(params),
    queryFn: () => inventoryService.getMovements(params),
  });
export const useInventoryOptions = () =>
  useQuery({
    queryKey: inventoryQueryKeys.options,
    queryFn: inventoryService.getOptions,
    staleTime: 5 * 60 * 1000,
  });
export const useProductBalance = (productId: string) =>
  useQuery({
    queryKey: inventoryQueryKeys.product(productId),
    queryFn: () => inventoryService.getProductBalance(productId),
    enabled: Boolean(productId),
  });
export const useStockReservations = (params: ReservationParams) =>
  useQuery({
    queryKey: inventoryQueryKeys.reservations(params),
    queryFn: () => inventoryService.getReservations(params),
  });

const useInventoryMutation = <TInput extends { productId: string }>(
  mutationFn: (input: TInput) => Promise<unknown>,
) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_, input) =>
      Promise.all([
        client.invalidateQueries({ queryKey: inventoryQueryKeys.balanceRoot }),
        client.invalidateQueries({ queryKey: inventoryQueryKeys.movementRoot }),
        client.invalidateQueries({ queryKey: inventoryQueryKeys.product(input.productId) }),
      ]),
  });
};
export const useCreateEntry = () => useInventoryMutation<EntryInput>(inventoryService.createEntry);
export const useCreateExit = () => useInventoryMutation<ExitInput>(inventoryService.createExit);
export const useCreateAdjustment = () =>
  useInventoryMutation<AdjustmentInput>(inventoryService.createAdjustment);
export const useCreateTransfer = () =>
  useInventoryMutation<TransferInput>(inventoryService.createTransfer);
