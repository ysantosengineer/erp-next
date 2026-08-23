import type { PurchaseOrderStatus } from '../../purchase-orders/types/purchase-order.types';

export interface PurchaseReceiptItemInput {
  purchaseOrderItemId: string;
  locationId: string;
  receivedQuantity: string;
  discrepancyReason?: string | null;
}

export interface PurchaseReceiptInput {
  purchaseOrderId: string;
  idempotencyKey: string;
  notes?: string | null;
  items: PurchaseReceiptItemInput[];
}

export interface PurchaseReceiptItem {
  id: string;
  purchaseOrderItemId: string;
  product: { id: string; name: string; sku: string; unitSymbol: string };
  location: {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    zone?: string | null;
    aisle?: string | null;
    rack?: string | null;
    level?: string | null;
    position?: string | null;
  };
  orderedQuantity: string;
  previouslyReceivedQuantity: string;
  receivedQuantity: string;
  remainingQuantity: string;
  unitCost: string;
  discrepancyReason: string | null;
}

export interface PurchaseReceipt {
  id: string;
  number: string;
  purchaseOrder: { id: string; name: string; number: string; status: PurchaseOrderStatus };
  supplier: { id: string; name: string; document?: string };
  warehouse: { id: string; name: string; code: string };
  receivedAt: string;
  notes: string | null;
  receivedBy: { id: string; name: string; email?: string };
  items: PurchaseReceiptItem[];
  itemCount: number;
  totalQuantity: string;
  createdAt: string;
}

export interface PurchaseReceiptFilters {
  page: number;
  limit: number;
  search?: string;
  purchaseOrderId?: string;
  supplierId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  sortBy: 'number' | 'receivedAt' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedPurchaseReceipts {
  data: PurchaseReceipt[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface PurchaseReceiptOptions {
  suppliers: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
}

export interface ReceivablePurchaseOrder {
  orderId: string;
  number: string;
  status: 'APPROVED' | 'PARTIALLY_RECEIVED';
  supplier: { id: string; name: string; document: string; isActive: boolean };
  warehouse: { id: string; name: string; code: string; isActive: boolean };
  expectedDeliveryDate: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    unitSymbol: string;
    orderedQuantity: string;
    receivedQuantity: string;
    pendingQuantity: string;
    unitCost: string;
  }>;
  locations: Array<{
    id: string;
    code: string;
    description: string | null;
    zone: string | null;
    aisle: string | null;
    rack: string | null;
    level: string | null;
    position: string | null;
  }>;
}
