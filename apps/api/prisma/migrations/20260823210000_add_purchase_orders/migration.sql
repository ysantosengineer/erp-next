CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

CREATE TABLE "PurchaseOrderSequence" (
  "companyId" UUID NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrderSequence_pkey" PRIMARY KEY ("companyId"),
  CONSTRAINT "PurchaseOrderSequence_lastNumber_check" CHECK ("lastNumber" >= 0)
);

CREATE TABLE "PurchaseOrder" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "supplierId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "number" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "expectedDeliveryDate" DATE,
  "notes" TEXT,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "freightAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "otherAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "createdByUserId" UUID NOT NULL,
  "approvedByUserId" UUID,
  "approvedAt" TIMESTAMP(3),
  "cancelledByUserId" UUID,
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrder_values_check" CHECK (
    "subtotal" >= 0 AND "discountAmount" >= 0 AND "freightAmount" >= 0 AND
    "otherAmount" >= 0 AND "totalAmount" >= 0
  )
);

CREATE TABLE "PurchaseOrderItem" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "purchaseOrderId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "productName" TEXT NOT NULL,
  "productSku" TEXT NOT NULL,
  "unitSymbol" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "unitCost" DECIMAL(14,2) NOT NULL,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "receivedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrderItem_values_check" CHECK (
    "quantity" > 0 AND "unitCost" >= 0 AND "subtotal" >= 0 AND
    "receivedQuantity" >= 0 AND "receivedQuantity" <= "quantity"
  )
);

CREATE UNIQUE INDEX "PurchaseOrder_companyId_number_key" ON "PurchaseOrder"("companyId", "number");
CREATE UNIQUE INDEX "PurchaseOrder_companyId_id_key" ON "PurchaseOrder"("companyId", "id");
CREATE INDEX "PurchaseOrder_companyId_status_createdAt_idx" ON "PurchaseOrder"("companyId", "status", "createdAt");
CREATE INDEX "PurchaseOrder_supplierId_createdAt_idx" ON "PurchaseOrder"("supplierId", "createdAt");
CREATE INDEX "PurchaseOrder_warehouseId_createdAt_idx" ON "PurchaseOrder"("warehouseId", "createdAt");
CREATE INDEX "PurchaseOrder_expectedDeliveryDate_idx" ON "PurchaseOrder"("expectedDeliveryDate");
CREATE UNIQUE INDEX "PurchaseOrderItem_companyId_purchaseOrderId_productId_key" ON "PurchaseOrderItem"("companyId", "purchaseOrderId", "productId");
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");
CREATE UNIQUE INDEX "Supplier_companyId_id_key" ON "Supplier"("companyId", "id");

ALTER TABLE "PurchaseOrderSequence" ADD CONSTRAINT "PurchaseOrderSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_supplierId_fkey" FOREIGN KEY ("companyId", "supplierId") REFERENCES "Supplier"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_warehouseId_fkey" FOREIGN KEY ("companyId", "warehouseId") REFERENCES "Warehouse"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_createdByUserId_fkey" FOREIGN KEY ("companyId", "createdByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_approvedByUserId_fkey" FOREIGN KEY ("companyId", "approvedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_cancelledByUserId_fkey" FOREIGN KEY ("companyId", "cancelledByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_companyId_purchaseOrderId_fkey" FOREIGN KEY ("companyId", "purchaseOrderId") REFERENCES "PurchaseOrder"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_companyId_productId_fkey" FOREIGN KEY ("companyId", "productId") REFERENCES "Product"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
