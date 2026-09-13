-- CreateTable
CREATE TABLE "CarePlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlanVariant" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "variantType" TEXT NOT NULL,
    "monthlyBasePrice" DOUBLE PRECISION NOT NULL,
    "monthlyGst" DOUBLE PRECISION NOT NULL,
    "monthlyTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CarePlanVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlanDuration" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "documentedTotal" DOUBLE PRECISION NOT NULL,
    "hasDiscount" BOOLEAN NOT NULL DEFAULT false,
    "discountNote" TEXT,

    CONSTRAINT "CarePlanDuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlanService" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CarePlanService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarePlan_slug_key" ON "CarePlan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CarePlanVariant_carePlanId_variantType_key" ON "CarePlanVariant"("carePlanId", "variantType");

-- CreateIndex
CREATE UNIQUE INDEX "CarePlanDuration_variantId_months_key" ON "CarePlanDuration"("variantId", "months");

-- AddForeignKey
ALTER TABLE "CarePlanVariant" ADD CONSTRAINT "CarePlanVariant_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlanDuration" ADD CONSTRAINT "CarePlanDuration_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "CarePlanVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlanService" ADD CONSTRAINT "CarePlanService_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "CarePlanVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
