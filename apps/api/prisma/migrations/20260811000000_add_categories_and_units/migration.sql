CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnitOfMeasure" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "normalizedSymbol" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_companyId_normalizedName_key" ON "Category"("companyId", "normalizedName");
CREATE INDEX "Category_companyId_isActive_idx" ON "Category"("companyId", "isActive");
CREATE UNIQUE INDEX "UnitOfMeasure_companyId_normalizedName_key" ON "UnitOfMeasure"("companyId", "normalizedName");
CREATE UNIQUE INDEX "UnitOfMeasure_companyId_normalizedSymbol_key" ON "UnitOfMeasure"("companyId", "normalizedSymbol");
CREATE INDEX "UnitOfMeasure_companyId_isActive_idx" ON "UnitOfMeasure"("companyId", "isActive");

ALTER TABLE "Category" ADD CONSTRAINT "Category_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
