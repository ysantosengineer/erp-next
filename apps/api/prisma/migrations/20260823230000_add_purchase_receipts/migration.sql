CREATE TABLE "PurchaseReceiptSequence" (
  "companyId" UUID NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseReceiptSequence_pkey" PRIMARY KEY ("companyId"),
  CONSTRAINT "PurchaseReceiptSequence_lastNumber_check" CHECK ("lastNumber" >= 0)
);

CREATE TABLE "PurchaseReceipt" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "purchaseOrderId" UUID NOT NULL,
  "number" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "receivedByUserId" UUID NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReceipt_idempotency_check" CHECK (length(trim("idempotencyKey")) > 0),
  CONSTRAINT "PurchaseReceipt_request_hash_check" CHECK (length("requestHash") = 64)
);

CREATE TABLE "PurchaseReceiptItem" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "purchaseReceiptId" UUID NOT NULL,
  "purchaseOrderItemId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "orderedQuantity" DECIMAL(18,4) NOT NULL,
  "previouslyReceivedQuantity" DECIMAL(18,4) NOT NULL,
  "receivedQuantity" DECIMAL(18,4) NOT NULL,
  "remainingQuantity" DECIMAL(18,4) NOT NULL,
  "unitCost" DECIMAL(14,2) NOT NULL,
  "discrepancyReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseReceiptItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReceiptItem_quantities_check" CHECK (
    "orderedQuantity" > 0 AND
    "previouslyReceivedQuantity" >= 0 AND
    "receivedQuantity" > 0 AND
    "remainingQuantity" >= 0 AND
    "previouslyReceivedQuantity" + "receivedQuantity" + "remainingQuantity" = "orderedQuantity" AND
    "unitCost" >= 0
  )
);

CREATE UNIQUE INDEX "PurchaseReceipt_companyId_number_key" ON "PurchaseReceipt"("companyId", "number");
CREATE UNIQUE INDEX "PurchaseReceipt_companyId_idempotencyKey_key" ON "PurchaseReceipt"("companyId", "idempotencyKey");
CREATE UNIQUE INDEX "PurchaseReceipt_companyId_id_key" ON "PurchaseReceipt"("companyId", "id");
CREATE INDEX "PurchaseReceipt_companyId_receivedAt_idx" ON "PurchaseReceipt"("companyId", "receivedAt");
CREATE INDEX "PurchaseReceipt_purchaseOrderId_receivedAt_idx" ON "PurchaseReceipt"("purchaseOrderId", "receivedAt");
CREATE INDEX "PurchaseReceipt_receivedByUserId_receivedAt_idx" ON "PurchaseReceipt"("receivedByUserId", "receivedAt");
CREATE UNIQUE INDEX "PurchaseReceiptItem_companyId_purchaseReceiptId_purchaseOrderItemId_key" ON "PurchaseReceiptItem"("companyId", "purchaseReceiptId", "purchaseOrderItemId");
CREATE INDEX "PurchaseReceiptItem_purchaseReceiptId_idx" ON "PurchaseReceiptItem"("purchaseReceiptId");
CREATE INDEX "PurchaseReceiptItem_purchaseOrderItemId_idx" ON "PurchaseReceiptItem"("purchaseOrderItemId");
CREATE INDEX "PurchaseReceiptItem_productId_idx" ON "PurchaseReceiptItem"("productId");
CREATE INDEX "PurchaseReceiptItem_locationId_idx" ON "PurchaseReceiptItem"("locationId");
CREATE UNIQUE INDEX "PurchaseOrderItem_companyId_id_key" ON "PurchaseOrderItem"("companyId", "id");

ALTER TABLE "PurchaseReceiptSequence" ADD CONSTRAINT "PurchaseReceiptSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_companyId_purchaseOrderId_fkey" FOREIGN KEY ("companyId", "purchaseOrderId") REFERENCES "PurchaseOrder"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_companyId_receivedByUserId_fkey" FOREIGN KEY ("companyId", "receivedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_companyId_purchaseReceiptId_fkey" FOREIGN KEY ("companyId", "purchaseReceiptId") REFERENCES "PurchaseReceipt"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_companyId_purchaseOrderItemId_fkey" FOREIGN KEY ("companyId", "purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_companyId_productId_fkey" FOREIGN KEY ("companyId", "productId") REFERENCES "Product"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_companyId_locationId_fkey" FOREIGN KEY ("companyId", "locationId") REFERENCES "StockLocation"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_purchase_receipt_mutation()
RETURNS trigger AS $$
BEGIN
  IF current_setting('erp.allow_purchase_receipt_mutation', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'PurchaseReceipt is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PurchaseReceipt_immutable"
BEFORE UPDATE OR DELETE ON "PurchaseReceipt"
FOR EACH ROW EXECUTE FUNCTION prevent_purchase_receipt_mutation();

CREATE TRIGGER "PurchaseReceiptItem_immutable"
BEFORE UPDATE OR DELETE ON "PurchaseReceiptItem"
FOR EACH ROW EXECUTE FUNCTION prevent_purchase_receipt_mutation();
