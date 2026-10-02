-- AlterTable
ALTER TABLE "MemberProfile" ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "idProofDocumentId" TEXT,
ADD COLUMN     "medicalConditions" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_idProofDocumentId_key" ON "MemberProfile"("idProofDocumentId");

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_idProofDocumentId_fkey" FOREIGN KEY ("idProofDocumentId") REFERENCES "MemberDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
