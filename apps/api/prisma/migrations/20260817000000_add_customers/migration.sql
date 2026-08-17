CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "type" "CustomerType" NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "document" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "creditLimit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Customer_creditLimit_nonnegative" CHECK ("creditLimit" >= 0),
    CONSTRAINT "Customer_document_digits" CHECK ("document" ~ '^[0-9]+$'),
    CONSTRAINT "Customer_document_length" CHECK (
        ("type" = 'INDIVIDUAL' AND length("document") = 11) OR
        ("type" = 'COMPANY' AND length("document") = 14)
    )
);

CREATE TABLE "CustomerAddress" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MAIN',
    "postalCode" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CustomerAddress_postalCode_digits" CHECK (
        "postalCode" IS NULL OR "postalCode" ~ '^[0-9]{8}$'
    )
);

CREATE UNIQUE INDEX "Customer_companyId_document_key" ON "Customer"("companyId", "document");
CREATE INDEX "Customer_companyId_isActive_type_idx" ON "Customer"("companyId", "isActive", "type");
CREATE INDEX "Customer_companyId_name_idx" ON "Customer"("companyId", "name");
CREATE INDEX "CustomerAddress_customerId_isPrimary_idx" ON "CustomerAddress"("customerId", "isPrimary");
CREATE UNIQUE INDEX "CustomerAddress_one_primary_key" ON "CustomerAddress"("customerId") WHERE "isPrimary" = true;

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
