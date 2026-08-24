CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED');

ALTER TABLE "SalesOrder"
  ADD COLUMN "reservedByUserId" UUID,
  ADD COLUMN "reservedAt" TIMESTAMP(3),
  ADD COLUMN "shippedByUserId" UUID,
  ADD COLUMN "shippedAt" TIMESTAMP(3),
  ADD COLUMN "shipmentNotes" TEXT;

ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_state_metadata_check";
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_state_metadata_check" CHECK (
  ("status" = 'DRAFT' AND "confirmedByUserId" IS NULL AND "confirmedAt" IS NULL AND "reservedByUserId" IS NULL AND "reservedAt" IS NULL AND "shippedByUserId" IS NULL AND "shippedAt" IS NULL AND "cancelledByUserId" IS NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL)
  OR ("status" = 'CONFIRMED' AND "confirmedByUserId" IS NOT NULL AND "confirmedAt" IS NOT NULL AND "reservedByUserId" IS NULL AND "reservedAt" IS NULL AND "shippedByUserId" IS NULL AND "shippedAt" IS NULL AND "cancelledByUserId" IS NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL)
  OR ("status" = 'RESERVED' AND "confirmedByUserId" IS NOT NULL AND "confirmedAt" IS NOT NULL AND "reservedByUserId" IS NOT NULL AND "reservedAt" IS NOT NULL AND "shippedByUserId" IS NULL AND "shippedAt" IS NULL AND "cancelledByUserId" IS NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL)
  OR ("status" = 'SHIPPED' AND "confirmedByUserId" IS NOT NULL AND "confirmedAt" IS NOT NULL AND "reservedByUserId" IS NOT NULL AND "reservedAt" IS NOT NULL AND "shippedByUserId" IS NOT NULL AND "shippedAt" IS NOT NULL AND "cancelledByUserId" IS NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL)
  OR ("status" = 'CANCELLED' AND "cancelledByUserId" IS NOT NULL AND "cancelledAt" IS NOT NULL AND length(trim("cancellationReason")) > 0 AND "shippedByUserId" IS NULL AND "shippedAt" IS NULL)
);

CREATE TABLE "StockReservation" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "salesOrderId" UUID NOT NULL,
  "salesOrderItemId" UUID NOT NULL, "productId" UUID NOT NULL, "locationId" UUID NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  "status" "StockReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" UUID NOT NULL, "releasedByUserId" UUID, "releasedAt" TIMESTAMP(3),
  "consumedByUserId" UUID, "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockReservation_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "StockReservation_status_metadata_check" CHECK (
    ("status" = 'ACTIVE' AND "releasedByUserId" IS NULL AND "releasedAt" IS NULL AND "consumedByUserId" IS NULL AND "consumedAt" IS NULL)
    OR ("status" = 'RELEASED' AND "releasedByUserId" IS NOT NULL AND "releasedAt" IS NOT NULL AND "consumedByUserId" IS NULL AND "consumedAt" IS NULL)
    OR ("status" = 'CONSUMED' AND "releasedByUserId" IS NULL AND "releasedAt" IS NULL AND "consumedByUserId" IS NOT NULL AND "consumedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "StockReservation_companyId_id_key" ON "StockReservation"("companyId", "id");
CREATE UNIQUE INDEX "StockReservation_active_allocation_key" ON "StockReservation"("companyId", "salesOrderItemId", "locationId") WHERE "status" = 'ACTIVE';
CREATE INDEX "StockReservation_companyId_status_createdAt_idx" ON "StockReservation"("companyId", "status", "createdAt");
CREATE INDEX "StockReservation_salesOrderId_status_idx" ON "StockReservation"("salesOrderId", "status");
CREATE INDEX "StockReservation_salesOrderItemId_status_idx" ON "StockReservation"("salesOrderItemId", "status");
CREATE INDEX "StockReservation_productId_locationId_status_idx" ON "StockReservation"("productId", "locationId", "status");
CREATE INDEX "StockReservation_locationId_status_idx" ON "StockReservation"("locationId", "status");

ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_reservedByUserId_fkey" FOREIGN KEY ("companyId", "reservedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_shippedByUserId_fkey" FOREIGN KEY ("companyId", "shippedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_companyId_salesOrderId_fkey" FOREIGN KEY ("companyId", "salesOrderId") REFERENCES "SalesOrder"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_companyId_salesOrderItemId_fkey" FOREIGN KEY ("companyId", "salesOrderItemId") REFERENCES "SalesOrderItem"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_companyId_productId_fkey" FOREIGN KEY ("companyId", "productId") REFERENCES "Product"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_companyId_locationId_fkey" FOREIGN KEY ("companyId", "locationId") REFERENCES "StockLocation"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_companyId_createdByUserId_fkey" FOREIGN KEY ("companyId", "createdByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_companyId_releasedByUserId_fkey" FOREIGN KEY ("companyId", "releasedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_companyId_consumedByUserId_fkey" FOREIGN KEY ("companyId", "consumedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_stock_reservation_delete() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'Stock reservations are historical and cannot be deleted'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "StockReservation_prevent_delete" BEFORE DELETE ON "StockReservation"
FOR EACH ROW EXECUTE FUNCTION prevent_stock_reservation_delete();
