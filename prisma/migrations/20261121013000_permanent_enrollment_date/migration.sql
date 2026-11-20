-- AlterTable: Add enrollmentDate to MemberProfile
ALTER TABLE "MemberProfile" ADD COLUMN IF NOT EXISTS "enrollmentDate" TIMESTAMP(3);

-- Copy existing dateOfEnrollment into enrollmentDate where dateOfEnrollment is not null
UPDATE "MemberProfile"
SET "enrollmentDate" = "dateOfEnrollment"
WHERE "dateOfEnrollment" IS NOT NULL AND "enrollmentDate" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MemberProfile_enrollmentDate_idx" ON "MemberProfile"("enrollmentDate");
