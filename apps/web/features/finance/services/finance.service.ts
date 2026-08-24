import { apiClient } from '../../../lib/api/api-client';
import type {
  CashFlowResponse,
  FinanceOptions,
  FinanceSummary,
  FinancialEntry,
  FinancialEntryInput,
  FinancialFilters,
  PaginatedFinancialEntries,
  FinancialPaymentMethod,
} from '../types/finance.types';

const queryString = (values: object) => {
  const query = new URLSearchParams();
  Object.entries(values as Record<string, string | number | boolean | undefined>).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    },
  );
  return query.toString();
};

export const financeService = {
  list: (filters: FinancialFilters) =>
    apiClient.get<PaginatedFinancialEntries>(`/finance/entries?${queryString(filters)}`),
  detail: (id: string) => apiClient.get<FinancialEntry>(`/finance/entries/${id}`),
  options: () => apiClient.get<FinanceOptions>('/finance/options'),
  create: (input: FinancialEntryInput) =>
    apiClient.post<FinancialEntry, FinancialEntryInput>('/finance/entries', input),
  update: ({ id, input }: { id: string; input: Partial<Omit<FinancialEntryInput, 'type'>> }) =>
    apiClient.patch<FinancialEntry, Partial<Omit<FinancialEntryInput, 'type'>>>(
      `/finance/entries/${id}`,
      input,
    ),
  settle: ({
    id,
    amount,
    settledAt,
    paymentMethod,
    notes,
    idempotencyKey,
  }: {
    id: string;
    amount: string;
    settledAt: string;
    paymentMethod: FinancialPaymentMethod;
    notes?: string;
    idempotencyKey: string;
  }) =>
    apiClient.post<
      { entry: FinancialEntry },
      {
        amount: string;
        settledAt: string;
        paymentMethod: FinancialPaymentMethod;
        notes?: string;
        idempotencyKey: string;
      }
    >(`/finance/entries/${id}/settlements`, {
      amount,
      settledAt,
      paymentMethod,
      notes,
      idempotencyKey,
    }),
  cancel: ({ id, reason }: { id: string; reason: string }) =>
    apiClient.post<FinancialEntry, { reason: string }>(`/finance/entries/${id}/cancel`, { reason }),
  cashFlow: (filters: {
    startDate: string;
    endDate: string;
    view: 'forecast' | 'realized' | 'combined';
    groupBy: 'day' | 'month';
  }) => apiClient.get<CashFlowResponse>(`/finance/cash-flow?${queryString(filters)}`),
  summary: (startDate: string, endDate: string) =>
    apiClient.get<FinanceSummary>(`/finance/summary?${queryString({ startDate, endDate })}`),
};
