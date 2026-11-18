-- AlterTable: Add employee app fields to Employee
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "isActivated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);

-- AlterTable: Add execution and reporting fields to CareVisit
ALTER TABLE "CareVisit" ADD COLUMN IF NOT EXISTS "workDescription" TEXT;
ALTER TABLE "CareVisit" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "CareVisit" ADD COLUMN IF NOT EXISTS "completedById" TEXT;

-- CreateTable: EmployeeSession
CREATE TABLE IF NOT EXISTS "EmployeeSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeSession_sessionToken_key" ON "EmployeeSession"("sessionToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeSession_employeeId_idx" ON "EmployeeSession"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeSession_sessionToken_idx" ON "EmployeeSession"("sessionToken");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeSession_employeeId_fkey'
    ) THEN
        ALTER TABLE "EmployeeSession" ADD CONSTRAINT "EmployeeSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
