CREATE TYPE "SupplierType" AS ENUM ('INDIVIDUAL', 'COMPANY');
CREATE TABLE "Supplier" ("id" UUID NOT NULL, "companyId" UUID NOT NULL, "type" "SupplierType" NOT NULL, "name" TEXT NOT NULL, "tradeName" TEXT, "document" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "contactName" TEXT, "notes" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SupplierAddress" ("id" UUID NOT NULL, "supplierId" UUID NOT NULL, "type" TEXT NOT NULL DEFAULT 'MAIN', "postalCode" TEXT, "street" TEXT, "number" TEXT, "complement" TEXT, "district" TEXT, "city" TEXT, "state" TEXT, "country" TEXT NOT NULL DEFAULT 'BR', "isPrimary" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SupplierAddress_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Supplier_companyId_document_key" ON "Supplier"("companyId", "document");
CREATE INDEX "Supplier_companyId_isActive_type_idx" ON "Supplier"("companyId", "isActive", "type");
CREATE INDEX "Supplier_companyId_name_idx" ON "Supplier"("companyId", "name");
CREATE INDEX "SupplierAddress_supplierId_isPrimary_idx" ON "SupplierAddress"("supplierId", "isPrimary");
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierAddress" ADD CONSTRAINT "SupplierAddress_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
