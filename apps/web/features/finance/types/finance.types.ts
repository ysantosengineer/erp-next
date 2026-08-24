export type FinancialEntryType = 'PAYABLE' | 'RECEIVABLE';
export type FinancialEntryStatus = 'OPEN' | 'PARTIALLY_SETTLED' | 'SETTLED' | 'CANCELLED';
export type FinancialPaymentMethod =
  'CASH' | 'BANK_TRANSFER' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_SLIP' | 'CHECK' | 'OTHER';
export type FinancialReferenceType =
  'MANUAL' | 'PURCHASE_ORDER' | 'PURCHASE_RECEIPT' | 'SALES_ORDER' | 'OTHER';

export interface FinancialSettlement {
  id: string;
  amount: string;
  settledAt: string;
  paymentMethod: FinancialPaymentMethod;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface FinancialEntry {
  id: string;
  number: string;
  type: FinancialEntryType;
  status: FinancialEntryStatus;
  description: string;
  documentNumber: string | null;
  supplier: { id: string; name: string; document: string; isActive: boolean } | null;
  customer: { id: string; name: string; document: string; isActive: boolean } | null;
  issueDate: string;
  dueDate: string;
  originalAmount: string;
  settledAmount: string;
  remainingAmount: string;
  overdue: boolean;
  daysOverdue: number;
  notes: string | null;
  referenceType: FinancialReferenceType;
  referenceId: string | null;
  createdBy: { id: string; name: string };
  cancelledBy: { id: string; name: string } | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  settlements: FinancialSettlement[];
  createdAt: string;
  updatedAt: string;
}

export interface FinancialEntryInput {
  type: FinancialEntryType;
  description: string;
  documentNumber?: string | null;
  supplierId?: string | null;
  customerId?: string | null;
  issueDate: string;
  dueDate: string;
  originalAmount: string;
  notes?: string | null;
}

export interface FinancialFilters {
  page: number;
  limit: number;
  type: FinancialEntryType;
  status?: FinancialEntryStatus;
  overdue?: boolean;
  search?: string;
  startDueDate?: string;
  endDueDate?: string;
  sortBy: 'number' | 'issueDate' | 'dueDate' | 'originalAmount' | 'settledAmount' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedFinancialEntries {
  data: FinancialEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface FinanceOptions {
  suppliers: Array<{ id: string; name: string; document: string }>;
  customers: Array<{ id: string; name: string; document: string }>;
}
export interface CashFlowRow {
  date: string;
  forecast: { receivables: string; payables: string; net: string };
  realized: { receivables: string; payables: string; net: string };
}
export interface CashFlowResponse {
  view: 'forecast' | 'realized' | 'combined';
  groupBy: 'day' | 'month';
  startDate: string;
  endDate: string;
  data: CashFlowRow[];
}
export interface FinanceSummary {
  totalReceivableOpen: string;
  totalPayableOpen: string;
  overdueReceivables: string;
  overduePayables: string;
  receivedInPeriod: string;
  paidInPeriod: string;
}
