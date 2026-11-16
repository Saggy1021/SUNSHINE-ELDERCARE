-- AlterTable: Add spouse / second member details to MemberProfile
ALTER TABLE "MemberProfile" ADD COLUMN "spouseFirstName" TEXT,
ADD COLUMN "spouseLastName" TEXT,
ADD COLUMN "spouseDateOfBirth" TIMESTAMP(3),
ADD COLUMN "spouseGender" TEXT,
ADD COLUMN "spouseMobileNumber" TEXT,
ADD COLUMN "spouseIdProofType" TEXT,
ADD COLUMN "spouseIdProofNumber" TEXT,
ADD COLUMN "spouseIdProofDocumentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_spouseIdProofDocumentId_key" ON "MemberProfile"("spouseIdProofDocumentId");

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_spouseIdProofDocumentId_fkey" FOREIGN KEY ("spouseIdProofDocumentId") REFERENCES "MemberDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
