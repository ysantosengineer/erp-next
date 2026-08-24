'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../services/finance.service';
import type { FinancialFilters } from '../types/finance.types';

export const financeKeys = {
  all: ['finance'] as const,
  list: (filters: FinancialFilters) => ['finance', 'entries', 'list', filters] as const,
  detail: (id: string) => ['finance', 'entries', 'detail', id] as const,
  options: ['finance', 'options'] as const,
  cashFlow: (filters: object) => ['finance', 'cash-flow', filters] as const,
  summary: (start: string, end: string) => ['finance', 'summary', start, end] as const,
};

export const useFinancialEntries = (filters: FinancialFilters) =>
  useQuery({
    queryKey: financeKeys.list(filters),
    queryFn: () => financeService.list(filters),
    placeholderData: (previous) => previous,
  });
export const useFinancialEntry = (id?: string) =>
  useQuery({
    queryKey: financeKeys.detail(id ?? ''),
    queryFn: () => financeService.detail(id!),
    enabled: Boolean(id),
  });
export const useFinanceOptions = () =>
  useQuery({ queryKey: financeKeys.options, queryFn: financeService.options, staleTime: 60_000 });
export const useCashFlow = (filters: {
  startDate: string;
  endDate: string;
  view: 'forecast' | 'realized' | 'combined';
  groupBy: 'day' | 'month';
}) =>
  useQuery({
    queryKey: financeKeys.cashFlow(filters),
    queryFn: () => financeService.cashFlow(filters),
  });
export const useFinanceSummary = (start: string, end: string) =>
  useQuery({
    queryKey: financeKeys.summary(start, end),
    queryFn: () => financeService.summary(start, end),
  });

function useInvalidateFinance() {
  const client = useQueryClient();
  return (id?: string) => {
    void client.invalidateQueries({ queryKey: financeKeys.all });
    if (id) void client.invalidateQueries({ queryKey: financeKeys.detail(id) });
  };
}
export function useCreateFinancialEntry() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: financeService.create,
    onSuccess: (entry) => invalidate(entry.id),
  });
}
export function useUpdateFinancialEntry() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: financeService.update,
    onSuccess: (entry) => invalidate(entry.id),
  });
}
export function useSettleFinancialEntry() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: financeService.settle,
    onSuccess: (result) => invalidate(result.entry.id),
  });
}
export function useCancelFinancialEntry() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: financeService.cancel,
    onSuccess: (entry) => invalidate(entry.id),
  });
}
