/*
  Warnings:

  - You are about to alter the column `subtotal` on the `Invoice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `taxAmount` on the `Invoice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `total` on the `Invoice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `unitPrice` on the `InvoiceLineItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `discount` on the `InvoiceLineItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `taxRateApplied` on the `InvoiceLineItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `taxAmount` on the `InvoiceLineItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `lineTotal` on the `InvoiceLineItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "subtotal" DROP NOT NULL,
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "taxAmount" DROP NOT NULL,
ALTER COLUMN "taxAmount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "InvoiceLineItem" ADD COLUMN     "discountNote" TEXT,
ADD COLUMN     "durationMonths" INTEGER,
ADD COLUMN     "planName" TEXT,
ADD COLUMN     "variantType" TEXT,
ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "taxRateApplied" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "taxAmount" DROP NOT NULL,
ALTER COLUMN "taxAmount" DROP DEFAULT,
ALTER COLUMN "taxAmount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "lineTotal" SET DATA TYPE DECIMAL(65,30);
