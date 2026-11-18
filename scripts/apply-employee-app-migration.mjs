import fs from "fs";
import { PrismaClient } from "@prisma/client";

const statements = [
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "isActivated" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);`,
  `ALTER TABLE "CareVisit" ADD COLUMN IF NOT EXISTS "workDescription" TEXT;`,
  `ALTER TABLE "CareVisit" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);`,
  `ALTER TABLE "CareVisit" ADD COLUMN IF NOT EXISTS "completedById" TEXT;`,
  `CREATE TABLE IF NOT EXISTS "EmployeeSession" (
      "id" TEXT NOT NULL,
      "sessionToken" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "expires" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmployeeSession_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeSession_sessionToken_key" ON "EmployeeSession"("sessionToken");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeSession_employeeId_idx" ON "EmployeeSession"("employeeId");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeSession_sessionToken_idx" ON "EmployeeSession"("sessionToken");`,
  `DO $$
  BEGIN
      IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeSession_employeeId_fkey'
      ) THEN
          ALTER TABLE "EmployeeSession" ADD CONSTRAINT "EmployeeSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
  END $$;`
];

async function applyToDb(url, label) {
  console.log(`\nApplying migration to ${label}...`);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
    console.log(`✓ Migration successfully applied to ${label}!`);
  } catch (err) {
    console.error(`❌ Failed applying to ${label}:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (fs.existsSync("/Users/tanish/Sunshine Web/.production-db-session.local")) {
    const prodSession = fs.readFileSync("/Users/tanish/Sunshine Web/.production-db-session.local", "utf8").trim();
    const prodMatch = prodSession.match(/^DATABASE_URL=["']?(.*?)["']?$/m);
    const prodUrl = prodMatch ? prodMatch[1] : prodSession;
    await applyToDb(prodUrl, "PRODUCTION DB");
  }
}

main().catch(console.error);
