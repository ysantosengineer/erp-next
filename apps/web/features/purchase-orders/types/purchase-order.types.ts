export type PurchaseOrderStatus =
  'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItemInput {
  productId: string;
  quantity: string;
  unitCost: string;
}
export interface PurchaseOrderInput {
  supplierId: string;
  warehouseId: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  discountAmount: string;
  freightAmount: string;
  otherAmount: string;
  items: PurchaseOrderItemInput[];
}
export interface PurchaseOrderItem extends PurchaseOrderItemInput {
  id: string;
  productName: string;
  productSku: string;
  unitSymbol: string;
  subtotal: string;
  receivedQuantity: string;
}
export interface PurchaseOrder {
  id: string;
  number: string;
  status: PurchaseOrderStatus;
  supplier: { id: string; name: string; document: string };
  warehouse: { id: string; name: string; code: string };
  expectedDeliveryDate: string | null;
  notes: string | null;
  subtotal: string;
  discountAmount: string;
  freightAmount: string;
  otherAmount: string;
  totalAmount: string;
  items: PurchaseOrderItem[];
  createdBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  cancelledBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}
export interface PurchaseOrderFilters {
  page: number;
  limit: number;
  search?: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  expectedDeliveryFrom?: string;
  expectedDeliveryTo?: string;
  sortBy: 'number' | 'createdAt' | 'expectedDeliveryDate' | 'totalAmount' | 'status';
  sortOrder: 'asc' | 'desc';
}
export interface PaginatedPurchaseOrders {
  data: PurchaseOrder[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface PurchaseOrderOptions {
  suppliers: Array<{ id: string; name: string; document: string }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    unitSymbol: string;
    suggestedUnitCost: string;
  }>;
}
