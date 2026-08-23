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
  warehouses: Array<{ id: string; name: string; code: string; quantity: string }>;
  locations: Array<LocationSummary & { quantity: string }>;
};
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
