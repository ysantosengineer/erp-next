CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

CREATE TABLE "SalesOrderSequence" (
  "companyId" UUID NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesOrderSequence_pkey" PRIMARY KEY ("companyId"),
  CONSTRAINT "SalesOrderSequence_lastNumber_check" CHECK ("lastNumber" >= 0)
);

CREATE TABLE "SalesOrder" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "warehouseId" UUID NOT NULL,
  "number" TEXT NOT NULL,
  "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "orderDate" DATE NOT NULL,
  "expectedDeliveryDate" DATE,
  "notes" TEXT,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "freightAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "otherAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "createdByUserId" UUID NOT NULL,
  "confirmedByUserId" UUID,
  "confirmedAt" TIMESTAMP(3),
  "cancelledByUserId" UUID,
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesOrder_amounts_check" CHECK (
    "subtotal" >= 0 AND
    "discountAmount" >= 0 AND
    "freightAmount" >= 0 AND
    "otherAmount" >= 0 AND
    "totalAmount" >= 0 AND
    "totalAmount" = "subtotal" - "discountAmount" + "freightAmount" + "otherAmount"
  ),
  CONSTRAINT "SalesOrder_state_metadata_check" CHECK (
    ("status" = 'DRAFT' AND "confirmedByUserId" IS NULL AND "confirmedAt" IS NULL AND "cancelledByUserId" IS NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL)
    OR
    ("status" = 'CONFIRMED' AND "confirmedByUserId" IS NOT NULL AND "confirmedAt" IS NOT NULL AND "cancelledByUserId" IS NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL)
    OR
    ("status" = 'CANCELLED' AND "cancelledByUserId" IS NOT NULL AND "cancelledAt" IS NOT NULL AND length(trim("cancellationReason")) > 0 AND (("confirmedByUserId" IS NULL AND "confirmedAt" IS NULL) OR ("confirmedByUserId" IS NOT NULL AND "confirmedAt" IS NOT NULL)))
  )
);

CREATE TABLE "SalesOrderItem" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "salesOrderId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "productName" TEXT NOT NULL,
  "productSku" TEXT NOT NULL,
  "unitSymbol" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "unitPrice" DECIMAL(14,2) NOT NULL,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "reservedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesOrderItem_values_check" CHECK (
    "quantity" > 0 AND
    "unitPrice" >= 0 AND
    "discountAmount" >= 0 AND
    "discountAmount" <= round("quantity" * "unitPrice", 2) AND
    "subtotal" = round("quantity" * "unitPrice", 2) - "discountAmount" AND
    "reservedQuantity" >= 0 AND
    "reservedQuantity" <= "quantity"
  )
);

CREATE UNIQUE INDEX "Customer_companyId_id_key" ON "Customer"("companyId", "id");
CREATE UNIQUE INDEX "SalesOrder_companyId_number_key" ON "SalesOrder"("companyId", "number");
CREATE UNIQUE INDEX "SalesOrder_companyId_id_key" ON "SalesOrder"("companyId", "id");
CREATE INDEX "SalesOrder_companyId_status_orderDate_idx" ON "SalesOrder"("companyId", "status", "orderDate");
CREATE INDEX "SalesOrder_customerId_orderDate_idx" ON "SalesOrder"("customerId", "orderDate");
CREATE INDEX "SalesOrder_warehouseId_orderDate_idx" ON "SalesOrder"("warehouseId", "orderDate");
CREATE INDEX "SalesOrder_expectedDeliveryDate_idx" ON "SalesOrder"("expectedDeliveryDate");
CREATE UNIQUE INDEX "SalesOrderItem_companyId_salesOrderId_productId_key" ON "SalesOrderItem"("companyId", "salesOrderId", "productId");
CREATE UNIQUE INDEX "SalesOrderItem_companyId_id_key" ON "SalesOrderItem"("companyId", "id");
CREATE INDEX "SalesOrderItem_salesOrderId_idx" ON "SalesOrderItem"("salesOrderId");
CREATE INDEX "SalesOrderItem_productId_idx" ON "SalesOrderItem"("productId");

ALTER TABLE "SalesOrderSequence" ADD CONSTRAINT "SalesOrderSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "Customer"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_warehouseId_fkey" FOREIGN KEY ("companyId", "warehouseId") REFERENCES "Warehouse"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_createdByUserId_fkey" FOREIGN KEY ("companyId", "createdByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_confirmedByUserId_fkey" FOREIGN KEY ("companyId", "confirmedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_cancelledByUserId_fkey" FOREIGN KEY ("companyId", "cancelledByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_companyId_salesOrderId_fkey" FOREIGN KEY ("companyId", "salesOrderId") REFERENCES "SalesOrder"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_companyId_productId_fkey" FOREIGN KEY ("companyId", "productId") REFERENCES "Product"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
