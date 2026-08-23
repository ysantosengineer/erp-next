CREATE TYPE "StockMovementType" AS ENUM (
    'ENTRY',
    'EXIT',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'TRANSFER'
);

CREATE UNIQUE INDEX "StockLocation_companyId_id_key" ON "StockLocation"("companyId", "id");
CREATE UNIQUE INDEX "Product_companyId_id_key" ON "Product"("companyId", "id");
CREATE UNIQUE INDEX "User_companyId_id_key" ON "User"("companyId", "id");

CREATE TABLE "InventoryBalance" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryBalance_quantity_nonnegative" CHECK ("quantity" >= 0)
);

CREATE TABLE "StockMovement" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "sourceLocationId" UUID,
    "destinationLocationId" UUID,
    "reason" TEXT,
    "referenceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "performedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StockMovement_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "StockMovement_topology" CHECK (
        ("type" IN ('ENTRY', 'ADJUSTMENT_IN') AND "sourceLocationId" IS NULL AND "destinationLocationId" IS NOT NULL)
        OR ("type" IN ('EXIT', 'ADJUSTMENT_OUT') AND "sourceLocationId" IS NOT NULL AND "destinationLocationId" IS NULL)
        OR ("type" = 'TRANSFER' AND "sourceLocationId" IS NOT NULL AND "destinationLocationId" IS NOT NULL AND "sourceLocationId" <> "destinationLocationId")
    ),
    CONSTRAINT "StockMovement_adjustment_reason" CHECK (
        "type" NOT IN ('ADJUSTMENT_IN', 'ADJUSTMENT_OUT') OR LENGTH(BTRIM(COALESCE("reason", ''))) > 0
    )
);

CREATE UNIQUE INDEX "InventoryBalance_companyId_productId_locationId_key"
ON "InventoryBalance"("companyId", "productId", "locationId");
CREATE INDEX "InventoryBalance_companyId_quantity_idx" ON "InventoryBalance"("companyId", "quantity");
CREATE INDEX "InventoryBalance_productId_idx" ON "InventoryBalance"("productId");
CREATE INDEX "InventoryBalance_locationId_idx" ON "InventoryBalance"("locationId");

CREATE UNIQUE INDEX "StockMovement_companyId_idempotencyKey_key"
ON "StockMovement"("companyId", "idempotencyKey");
CREATE INDEX "StockMovement_companyId_createdAt_idx" ON "StockMovement"("companyId", "createdAt");
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");
CREATE INDEX "StockMovement_sourceLocationId_createdAt_idx" ON "StockMovement"("sourceLocationId", "createdAt");
CREATE INDEX "StockMovement_destinationLocationId_createdAt_idx" ON "StockMovement"("destinationLocationId", "createdAt");
CREATE INDEX "StockMovement_performedByUserId_createdAt_idx" ON "StockMovement"("performedByUserId", "createdAt");
CREATE INDEX "StockMovement_type_createdAt_idx" ON "StockMovement"("type", "createdAt");

ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_companyId_productId_fkey"
FOREIGN KEY ("companyId", "productId") REFERENCES "Product"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_companyId_locationId_fkey"
FOREIGN KEY ("companyId", "locationId") REFERENCES "StockLocation"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_companyId_productId_fkey"
FOREIGN KEY ("companyId", "productId") REFERENCES "Product"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_companyId_sourceLocationId_fkey"
FOREIGN KEY ("companyId", "sourceLocationId") REFERENCES "StockLocation"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_companyId_destinationLocationId_fkey"
FOREIGN KEY ("companyId", "destinationLocationId") REFERENCES "StockLocation"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_companyId_performedByUserId_fkey"
FOREIGN KEY ("companyId", "performedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_stock_movement_mutation() RETURNS trigger AS $$
BEGIN
    IF current_setting('erp.allow_stock_movement_mutation', true) = 'on' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'StockMovement is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "StockMovement_immutable"
BEFORE UPDATE OR DELETE ON "StockMovement"
FOR EACH ROW EXECUTE FUNCTION prevent_stock_movement_mutation();
