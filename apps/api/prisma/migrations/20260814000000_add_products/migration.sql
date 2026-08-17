CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "primarySupplierId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "costPrice" DECIMAL(14,2) NOT NULL,
    "salePrice" DECIMAL(14,2) NOT NULL,
    "weight" DECIMAL(14,3),
    "height" DECIMAL(14,3),
    "width" DECIMAL(14,3),
    "length" DECIMAL(14,3),
    "minimumStock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_costPrice_nonnegative" CHECK ("costPrice" >= 0),
    CONSTRAINT "Product_salePrice_nonnegative" CHECK ("salePrice" >= 0),
    CONSTRAINT "Product_weight_nonnegative" CHECK ("weight" IS NULL OR "weight" >= 0),
    CONSTRAINT "Product_height_nonnegative" CHECK ("height" IS NULL OR "height" >= 0),
    CONSTRAINT "Product_width_nonnegative" CHECK ("width" IS NULL OR "width" >= 0),
    CONSTRAINT "Product_length_nonnegative" CHECK ("length" IS NULL OR "length" >= 0),
    CONSTRAINT "Product_minimumStock_nonnegative" CHECK ("minimumStock" >= 0)
);

CREATE UNIQUE INDEX "Product_companyId_sku_key" ON "Product"("companyId", "sku");
CREATE UNIQUE INDEX "Product_companyId_barcode_key" ON "Product"("companyId", "barcode");
CREATE INDEX "Product_companyId_isActive_idx" ON "Product"("companyId", "isActive");
CREATE INDEX "Product_companyId_name_idx" ON "Product"("companyId", "name");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_unitId_idx" ON "Product"("unitId");
CREATE INDEX "Product_primarySupplierId_idx" ON "Product"("primarySupplierId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_primarySupplierId_fkey" FOREIGN KEY ("primarySupplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
