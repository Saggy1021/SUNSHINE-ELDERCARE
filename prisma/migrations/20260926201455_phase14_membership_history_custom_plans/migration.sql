-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "customPlanId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "customPlanId" TEXT;

-- CreateTable
CREATE TABLE "CustomPlanAgreement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "authorizedByUserId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "durationType" TEXT NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "calculatedEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomPlanAgreement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customPlanId_fkey" FOREIGN KEY ("customPlanId") REFERENCES "CustomPlanAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customPlanId_fkey" FOREIGN KEY ("customPlanId") REFERENCES "CustomPlanAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPlanAgreement" ADD CONSTRAINT "CustomPlanAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPlanAgreement" ADD CONSTRAINT "CustomPlanAgreement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPlanAgreement" ADD CONSTRAINT "CustomPlanAgreement_authorizedByUserId_fkey" FOREIGN KEY ("authorizedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
