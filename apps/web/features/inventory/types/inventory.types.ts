export type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'TRANSFER';
export type LocationSummary = {
  id: string;
  code: string;
  warehouse: { id: string; name: string; code: string };
};
export type ProductSummary = { id: string; name: string; sku: string; unit: { symbol: string } };
export type InventoryBalance = {
  id: string;
  quantity: string;
  reservedQuantity: string;
  availableQuantity: string;
  product: ProductSummary & { minimumStock: string; isActive: boolean };
  location: LocationSummary & {
    isActive: boolean;
    warehouse: LocationSummary['warehouse'] & { isActive: boolean };
  };
  createdAt: string;
  updatedAt: string;
};
export type StockMovement = {
  id: string;
  type: MovementType;
  quantity: string;
  product: ProductSummary;
  sourceLocation: LocationSummary | null;
  destinationLocation: LocationSummary | null;
  reason: string | null;
  referenceType: string;
  referenceId: string | null;
  performedBy: { id: string; name: string; email: string };
  createdAt: string;
};
export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };
export type PaginatedBalances = { data: InventoryBalance[]; meta: PaginationMeta };
export type PaginatedMovements = { data: StockMovement[]; meta: PaginationMeta };
export type InventoryOptions = { products: ProductSummary[]; locations: LocationSummary[] };
export type ProductBalance = {
  product: ProductSummary;
  totalQuantity: string;
  totalReservedQuantity: string;
  totalAvailableQuantity: string;
  warehouses: Array<{
    id: string;
    name: string;
    code: string;
    quantity: string;
    reservedQuantity: string;
    availableQuantity: string;
  }>;
  locations: Array<
    LocationSummary & {
      quantity: string;
      reservedQuantity: string;
      availableQuantity: string;
    }
  >;
};

export type StockReservationStatus = 'ACTIVE' | 'RELEASED' | 'CONSUMED';
export type StockReservation = {
  id: string;
  status: StockReservationStatus;
  quantity: string;
  salesOrder: { id: string; number: string; status: string };
  salesOrderItemId: string;
  product: { id: string; name: string; sku: string; unitSymbol: string };
  location: LocationSummary;
  createdBy: { id: string; name: string };
  releasedBy: { id: string; name: string } | null;
  consumedBy: { id: string; name: string } | null;
  createdAt: string;
  releasedAt: string | null;
  consumedAt: string | null;
};
export type ReservationParams = {
  page: number;
  limit: number;
  salesOrderId?: string;
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  status?: StockReservationStatus;
  startDate?: string;
  endDate?: string;
};
export type PaginatedReservations = { data: StockReservation[]; meta: PaginationMeta };
export type BalanceParams = {
  page: number;
  limit: number;
  search?: string;
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  sortBy: 'quantity' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
};
export type MovementParams = {
  page: number;
  limit: number;
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  performedByUserId?: string;
  type?: MovementType;
  from?: string;
  to?: string;
  sortOrder: 'asc' | 'desc';
};
export type MovementInput = {
  productId: string;
  quantity: string;
  reason?: string;
  idempotencyKey?: string;
};
export type EntryInput = MovementInput & { destinationLocationId: string };
export type ExitInput = MovementInput & { sourceLocationId: string };
export type AdjustmentInput = MovementInput & {
  locationId: string;
  direction: 'IN' | 'OUT';
  reason: string;
};
export type TransferInput = MovementInput & {
  sourceLocationId: string;
  destinationLocationId: string;
};
