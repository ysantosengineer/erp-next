-- CreateEnum
CREATE TYPE "InventoryCountStatus" AS ENUM (
    'DRAFT',
    'IN_PROGRESS',
    'RECOUNT_REQUIRED',
    'READY_FOR_APPROVAL',
    'APPROVED',
    'CANCELLED'
);

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "status" "InventoryCountStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "approvedByUserId" UUID,
    "cancelledByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountItem" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "inventoryCountId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "systemQuantity" DECIMAL(18,4) NOT NULL,
    "firstCountQuantity" DECIMAL(18,4),
    "recountQuantity" DECIMAL(18,4),
    "countedByUserId" UUID,
    "recountedByUserId" UUID,
    "countedAt" TIMESTAMP(3),
    "recountedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCountItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryCountItem_systemQuantity_check" CHECK ("systemQuantity" >= 0),
    CONSTRAINT "InventoryCountItem_firstCountQuantity_check" CHECK (
        "firstCountQuantity" IS NULL OR "firstCountQuantity" >= 0
    ),
    CONSTRAINT "InventoryCountItem_recountQuantity_check" CHECK (
        "recountQuantity" IS NULL OR "recountQuantity" >= 0
    )
);

-- Indexes
CREATE INDEX "InventoryCount_companyId_status_createdAt_idx"
    ON "InventoryCount"("companyId", "status", "createdAt");
CREATE INDEX "InventoryCount_warehouseId_status_idx"
    ON "InventoryCount"("warehouseId", "status");
CREATE INDEX "InventoryCount_createdByUserId_createdAt_idx"
    ON "InventoryCount"("createdByUserId", "createdAt");
CREATE UNIQUE INDEX "InventoryCount_companyId_id_key"
    ON "InventoryCount"("companyId", "id");
CREATE UNIQUE INDEX "InventoryCount_active_warehouse_key"
    ON "InventoryCount"("companyId", "warehouseId")
    WHERE "status" IN ('DRAFT', 'IN_PROGRESS', 'RECOUNT_REQUIRED', 'READY_FOR_APPROVAL');

CREATE INDEX "InventoryCountItem_inventoryCountId_productId_idx"
    ON "InventoryCountItem"("inventoryCountId", "productId");
CREATE INDEX "InventoryCountItem_locationId_idx"
    ON "InventoryCountItem"("locationId");
CREATE INDEX "InventoryCountItem_countedByUserId_idx"
    ON "InventoryCountItem"("countedByUserId");
CREATE INDEX "InventoryCountItem_recountedByUserId_idx"
    ON "InventoryCountItem"("recountedByUserId");
CREATE UNIQUE INDEX "InventoryCountItem_companyId_inventoryCountId_productId_loc_key"
    ON "InventoryCountItem"("companyId", "inventoryCountId", "productId", "locationId");

-- ForeignKeys
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_companyId_warehouseId_fkey"
    FOREIGN KEY ("companyId", "warehouseId") REFERENCES "Warehouse"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_companyId_createdByUserId_fkey"
    FOREIGN KEY ("companyId", "createdByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_companyId_approvedByUserId_fkey"
    FOREIGN KEY ("companyId", "approvedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_companyId_cancelledByUserId_fkey"
    FOREIGN KEY ("companyId", "cancelledByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_companyId_inventoryCountId_fkey"
    FOREIGN KEY ("companyId", "inventoryCountId") REFERENCES "InventoryCount"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_companyId_productId_fkey"
    FOREIGN KEY ("companyId", "productId") REFERENCES "Product"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_companyId_locationId_fkey"
    FOREIGN KEY ("companyId", "locationId") REFERENCES "StockLocation"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_companyId_countedByUserId_fkey"
    FOREIGN KEY ("companyId", "countedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_companyId_recountedByUserId_fkey"
    FOREIGN KEY ("companyId", "recountedByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
