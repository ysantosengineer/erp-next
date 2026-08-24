export type SalesOrderStatus = 'DRAFT' | 'CONFIRMED' | 'RESERVED' | 'SHIPPED' | 'CANCELLED';

export interface SalesOrderItemInput {
  productId: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
}

export interface SalesOrderInput {
  customerId: string;
  warehouseId: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  discountAmount: string;
  freightAmount: string;
  otherAmount: string;
  items: SalesOrderItemInput[];
}

export interface SalesOrderItem extends SalesOrderItemInput {
  id: string;
  productName: string;
  productSku: string;
  unitSymbol: string;
  grossAmount: string;
  subtotal: string;
  reservedQuantity: string;
  reservations: Array<{
    id: string;
    status: 'ACTIVE' | 'RELEASED' | 'CONSUMED';
    quantity: string;
    location: {
      id: string;
      code: string;
      warehouse: { id: string; name: string; code: string };
    };
  }>;
}

export interface SalesOrder {
  id: string;
  number: string;
  status: SalesOrderStatus;
  customer: { id: string; name: string; document: string; creditLimit: string };
  warehouse: { id: string; name: string; code: string };
  orderDate: string;
  expectedDeliveryDate: string | null;
  notes: string | null;
  subtotal: string;
  discountAmount: string;
  freightAmount: string;
  otherAmount: string;
  totalAmount: string;
  items: SalesOrderItem[];
  createdBy: { id: string; name: string };
  confirmedBy: { id: string; name: string } | null;
  reservedBy: { id: string; name: string } | null;
  shippedBy: { id: string; name: string } | null;
  cancelledBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  reservedAt: string | null;
  shippedAt: string | null;
  shipmentNotes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface SalesOrderStockOperation {
  orderId: string;
  number: string;
  status: SalesOrderStatus;
  reservations: Array<{
    id: string;
    status: 'ACTIVE' | 'RELEASED' | 'CONSUMED';
    quantity: string;
  }>;
}

export interface SalesOrderFilters {
  page: number;
  limit: number;
  search?: string;
  status?: SalesOrderStatus;
  customerId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  expectedDeliveryFrom?: string;
  expectedDeliveryTo?: string;
  sortBy: 'number' | 'orderDate' | 'createdAt' | 'expectedDeliveryDate' | 'totalAmount' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedSalesOrders {
  data: SalesOrder[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface SalesOrderOptions {
  customers: Array<{ id: string; name: string; document: string; creditLimit: string }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    unitSymbol: string;
    suggestedUnitPrice: string;
  }>;
}
