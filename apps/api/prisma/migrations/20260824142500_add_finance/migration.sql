CREATE TYPE "FinancialEntryType" AS ENUM ('PAYABLE', 'RECEIVABLE');
CREATE TYPE "FinancialEntryStatus" AS ENUM ('OPEN', 'PARTIALLY_SETTLED', 'SETTLED', 'CANCELLED');
CREATE TYPE "FinancialPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_SLIP', 'CHECK', 'OTHER');
CREATE TYPE "FinancialReferenceType" AS ENUM ('MANUAL', 'PURCHASE_ORDER', 'PURCHASE_RECEIPT', 'SALES_ORDER', 'OTHER');

CREATE TABLE "FinancialEntrySequence" (
  "companyId" UUID NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialEntrySequence_pkey" PRIMARY KEY ("companyId")
);

CREATE TABLE "FinancialEntry" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "number" TEXT NOT NULL,
  "type" "FinancialEntryType" NOT NULL,
  "status" "FinancialEntryStatus" NOT NULL DEFAULT 'OPEN',
  "description" TEXT NOT NULL,
  "documentNumber" TEXT,
  "supplierId" UUID,
  "customerId" UUID,
  "issueDate" DATE NOT NULL,
  "dueDate" DATE NOT NULL,
  "originalAmount" DECIMAL(14,2) NOT NULL,
  "settledAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "referenceType" "FinancialReferenceType" NOT NULL DEFAULT 'MANUAL',
  "referenceId" UUID,
  "createdByUserId" UUID NOT NULL,
  "cancelledByUserId" UUID,
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialEntry_positive_amount_check" CHECK ("originalAmount" > 0),
  CONSTRAINT "FinancialEntry_settled_amount_check" CHECK ("settledAmount" >= 0 AND "settledAmount" <= "originalAmount"),
  CONSTRAINT "FinancialEntry_dates_check" CHECK ("dueDate" >= "issueDate"),
  CONSTRAINT "FinancialEntry_party_check" CHECK (
    ("type" = 'PAYABLE' AND "customerId" IS NULL) OR
    ("type" = 'RECEIVABLE' AND "supplierId" IS NULL)
  ),
  CONSTRAINT "FinancialEntry_status_check" CHECK (
    ("status" = 'OPEN' AND "settledAmount" = 0) OR
    ("status" = 'PARTIALLY_SETTLED' AND "settledAmount" > 0 AND "settledAmount" < "originalAmount") OR
    ("status" = 'SETTLED' AND "settledAmount" = "originalAmount") OR
    ("status" = 'CANCELLED' AND "settledAmount" = 0)
  ),
  CONSTRAINT "FinancialEntry_cancellation_check" CHECK (
    ("status" = 'CANCELLED' AND "cancelledByUserId" IS NOT NULL AND "cancelledAt" IS NOT NULL AND "cancellationReason" IS NOT NULL) OR
    ("status" <> 'CANCELLED' AND "cancelledByUserId" IS NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL)
  ),
  CONSTRAINT "FinancialEntry_reference_check" CHECK (
    ("referenceType" = 'MANUAL' AND "referenceId" IS NULL) OR
    ("referenceType" IN ('PURCHASE_ORDER', 'PURCHASE_RECEIPT', 'SALES_ORDER') AND "referenceId" IS NOT NULL) OR
    ("referenceType" = 'OTHER')
  )
);

CREATE TABLE "FinancialSettlement" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "financialEntryId" UUID NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "settlementDate" DATE NOT NULL,
  "paymentMethod" "FinancialPaymentMethod" NOT NULL,
  "notes" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialSettlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialSettlement_positive_amount_check" CHECK ("amount" > 0)
);

CREATE INDEX "FinancialEntry_companyId_type_status_dueDate_idx" ON "FinancialEntry"("companyId", "type", "status", "dueDate");
CREATE INDEX "FinancialEntry_companyId_documentNumber_idx" ON "FinancialEntry"("companyId", "documentNumber");
CREATE INDEX "FinancialEntry_supplierId_dueDate_idx" ON "FinancialEntry"("supplierId", "dueDate");
CREATE INDEX "FinancialEntry_customerId_dueDate_idx" ON "FinancialEntry"("customerId", "dueDate");
CREATE INDEX "FinancialEntry_referenceType_referenceId_idx" ON "FinancialEntry"("referenceType", "referenceId");
CREATE UNIQUE INDEX "FinancialEntry_companyId_number_key" ON "FinancialEntry"("companyId", "number");
CREATE UNIQUE INDEX "FinancialEntry_companyId_id_key" ON "FinancialEntry"("companyId", "id");
CREATE INDEX "FinancialSettlement_companyId_settlementDate_idx" ON "FinancialSettlement"("companyId", "settlementDate");
CREATE INDEX "FinancialSettlement_financialEntryId_createdAt_idx" ON "FinancialSettlement"("financialEntryId", "createdAt");
CREATE UNIQUE INDEX "FinancialSettlement_companyId_idempotencyKey_key" ON "FinancialSettlement"("companyId", "idempotencyKey");

ALTER TABLE "FinancialEntrySequence" ADD CONSTRAINT "FinancialEntrySequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_companyId_supplierId_fkey" FOREIGN KEY ("companyId", "supplierId") REFERENCES "Supplier"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "Customer"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_companyId_createdByUserId_fkey" FOREIGN KEY ("companyId", "createdByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_companyId_cancelledByUserId_fkey" FOREIGN KEY ("companyId", "cancelledByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialSettlement" ADD CONSTRAINT "FinancialSettlement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialSettlement" ADD CONSTRAINT "FinancialSettlement_companyId_financialEntryId_fkey" FOREIGN KEY ("companyId", "financialEntryId") REFERENCES "FinancialEntry"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialSettlement" ADD CONSTRAINT "FinancialSettlement_companyId_createdByUserId_fkey" FOREIGN KEY ("companyId", "createdByUserId") REFERENCES "User"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
