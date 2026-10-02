-- AlterTable
ALTER TABLE "RenewalRequest" ADD COLUMN     "customPrice" DECIMAL(65,30),
ADD COLUMN     "requestType" TEXT NOT NULL DEFAULT 'RENEWAL';
