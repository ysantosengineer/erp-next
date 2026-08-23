export type InventoryCountStatus =
  'DRAFT' | 'IN_PROGRESS' | 'RECOUNT_REQUIRED' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'CANCELLED';

export type InventoryCountSummary = {
  totalItems: number;
  countedItems: number;
  divergentItems: number;
  recountPendingItems: number;
  positiveDifferences: number;
  negativeDifferences: number;
};

export type InventoryCount = {
  id: string;
  status: InventoryCountStatus;
  description: string | null;
  warehouse: { id: string; name: string; code: string; isActive: boolean };
  createdBy: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string; email: string } | null;
  cancelledBy: { id: string; name: string; email: string } | null;
  summary: InventoryCountSummary;
  startedAt: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryCountItem = {
  id: string;
  product: { id: string; name: string; sku: string; unit: { symbol: string } };
  location: { id: string; code: string };
  systemQuantity: string;
  firstCountQuantity: string | null;
  recountQuantity: string | null;
  finalCountQuantity: string | null;
  differenceQuantity: string | null;
  countedBy: { id: string; name: string } | null;
  recountedBy: { id: string; name: string } | null;
  countedAt: string | null;
  recountedAt: string | null;
  status:
    'COUNT_PENDING' | 'RECOUNT_PENDING' | 'MATCHED' | 'POSITIVE_DIFFERENCE' | 'NEGATIVE_DIFFERENCE';
};

export type InventoryCountDetail = InventoryCount & {
  items: {
    data: InventoryCountItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  };
  movements: Array<{
    id: string;
    type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
    quantity: string;
    productId: string;
    createdAt: string;
  }>;
};

export type InventoryCountListParams = {
  page: number;
  limit: number;
  search?: string;
  warehouseId?: string;
  status?: InventoryCountStatus;
  startDate?: string;
  endDate?: string;
  sortBy: 'createdAt' | 'startedAt' | 'status';
  sortOrder: 'asc' | 'desc';
};

export type InventoryCountDetailParams = {
  itemsPage: number;
  itemsLimit: number;
  itemSearch?: string;
};

export type PaginatedInventoryCounts = {
  data: InventoryCount[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type CreateInventoryCountInput = { warehouseId: string; description?: string };
export type AddInventoryCountItemInput = { productId: string; locationId: string };
export type SubmitCountInput = { quantity: string };
export type InventoryCountOptions = {
  products: Array<{ id: string; name: string; sku: string; unit: { symbol: string } }>;
  locations: Array<{ id: string; code: string }>;
};
