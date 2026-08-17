CREATE TABLE "Warehouse" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Warehouse_code_format" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9._/-]*$')
);

CREATE TABLE "StockLocation" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "zone" TEXT,
    "aisle" TEXT,
    "rack" TEXT,
    "level" TEXT,
    "position" TEXT,
    "capacity" DECIMAL(14,3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StockLocation_code_format" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9._/-]*$'),
    CONSTRAINT "StockLocation_capacity_nonnegative" CHECK ("capacity" IS NULL OR "capacity" >= 0)
);

CREATE UNIQUE INDEX "Warehouse_companyId_code_key" ON "Warehouse"("companyId", "code");
CREATE UNIQUE INDEX "Warehouse_companyId_id_key" ON "Warehouse"("companyId", "id");
CREATE INDEX "Warehouse_companyId_isActive_idx" ON "Warehouse"("companyId", "isActive");
CREATE INDEX "Warehouse_companyId_name_idx" ON "Warehouse"("companyId", "name");

CREATE UNIQUE INDEX "StockLocation_warehouseId_code_key" ON "StockLocation"("warehouseId", "code");
CREATE INDEX "StockLocation_companyId_isActive_idx" ON "StockLocation"("companyId", "isActive");
CREATE INDEX "StockLocation_warehouseId_isActive_idx" ON "StockLocation"("warehouseId", "isActive");
CREATE INDEX "StockLocation_warehouseId_zone_idx" ON "StockLocation"("warehouseId", "zone");

ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_companyId_warehouseId_fkey"
FOREIGN KEY ("companyId", "warehouseId") REFERENCES "Warehouse"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
