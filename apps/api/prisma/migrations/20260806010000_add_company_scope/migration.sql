-- Ensure there is a company available to receive existing single-company records.
INSERT INTO "Company" ("id", "name", "isActive", "createdAt", "updatedAt")
SELECT '00000000-0000-4000-8000-000000000001'::uuid, 'ERP Next Migrated', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Company");

ALTER TABLE "User" ADD COLUMN "companyId" UUID;
ALTER TABLE "Role" ADD COLUMN "companyId" UUID;
ALTER TABLE "AuditLog" ADD COLUMN "companyId" UUID;

UPDATE "User"
SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "companyId" IS NULL;

UPDATE "Role"
SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "companyId" IS NULL;

UPDATE "AuditLog" AS audit
SET "companyId" = actor."companyId"
FROM "User" AS actor
WHERE audit."actorId" = actor."id" AND audit."companyId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Role" ALTER COLUMN "companyId" SET NOT NULL;

DROP INDEX "Role_name_key";
CREATE UNIQUE INDEX "Role_companyId_name_key" ON "Role"("companyId", "name");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE INDEX "Role_companyId_idx" ON "Role"("companyId");
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Role" ADD CONSTRAINT "Role_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
