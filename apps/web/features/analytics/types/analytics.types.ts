export type AnalyticsPeriod = {
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
  groupBy: 'day' | 'month';
  timezone: 'UTC';
};

export type SalesSummary = {
  ordersCount: number;
  grossSalesAmount: string;
  averageOrderValue: string;
  itemsSoldQuantity: { unitSymbol: string; quantity: string }[];
  comparison: {
    previousOrdersCount: number;
    previousGrossSalesAmount: string;
    changePercentage: number | null;
  };
  statusDistribution: { status: string; count: number }[];
  series: { period: string; ordersCount: number; amount: string }[];
  topProducts: {
    id: string;
    name: string;
    sku: string;
    unitSymbol: string;
    quantity: string;
    amount: string;
  }[];
};

export type PurchaseSummary = {
  ordersCount: number;
  ordersAmount: string;
  approvedOrdersCount: number;
  approvedPurchasesAmount: string;
  receiptsCount: number;
  receivedAmount: string;
  pendingReceiptsCount: number;
};

export type InventorySummary = {
  productsCount: number;
  productsWithStock: number;
  productsWithoutStock: number;
  lowStockProducts: number;
  activeReservations: number;
  reservedOrders: number;
  recentMovements: null | Array<{
    id: string;
    type: string;
    quantity: string;
    unitSymbol: string;
    createdAt: string;
    product: { id: string; name: string; sku: string };
  }>;
};

export type FinanceSummary = {
  totalReceivableOpen: string;
  totalPayableOpen: string;
  overdueReceivables: string;
  overduePayables: string;
  receivedInPeriod: string;
  paidInPeriod: string;
  realizedNet: string;
};

export type DashboardAnalytics = {
  period: AnalyticsPeriod;
  generatedAt: string;
  sections: {
    sales: SalesSummary | null;
    purchases: PurchaseSummary | null;
    inventory: InventorySummary | null;
    finance: FinanceSummary | null;
  };
  alerts: Array<{ code: string; label: string; count?: number; amount?: string; href: string }>;
};

export type AnalyticsFilters = { startDate: string; endDate: string; warehouseId?: string };
export type ReportFilters = AnalyticsFilters & {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
export type PageMeta = { page: number; limit: number; total: number; totalPages: number };
export type ReportResponse<T> = {
  period?: AnalyticsPeriod;
  summary?: SalesSummary | PurchaseSummary;
  data: T[];
  meta: PageMeta;
};

export type SalesReportRow = {
  id: string;
  number: string;
  orderDate: string;
  status: string;
  totalAmount: string;
  customer: { name: string };
  warehouse: { name: string };
};
export type PurchaseReportRow = {
  id: string;
  number: string;
  createdAt: string;
  expectedDeliveryDate: string | null;
  status: string;
  totalAmount: string;
  receivedAmount: string;
  pendingItemsCount: number;
  supplier: { name: string };
  warehouse: { name: string };
};
export type InventoryReportRow = {
  productId: string;
  productName: string;
  sku: string;
  unitSymbol: string;
  minimumStock: string;
  warehouseName: string | null;
  locationCode: string | null;
  physical: string;
  reserved: string;
  available: string;
};
export type FinanceReportRow = {
  id: string;
  number: string;
  type: string;
  status: string;
  description: string;
  originalAmount: string;
  settledAmount: string;
  remainingAmount: string;
  overdue: boolean;
  daysOverdue: number;
};
export type AnalyticsReportResponse =
  | ReportResponse<SalesReportRow>
  | ReportResponse<PurchaseReportRow>
  | ReportResponse<InventoryReportRow>
  | ReportResponse<FinanceReportRow>;
