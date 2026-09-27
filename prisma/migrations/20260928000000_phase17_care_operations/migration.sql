-- AlterTable
ALTER TABLE "Elder" ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "relationship" TEXT NOT NULL DEFAULT 'Self',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "CareCase" (
    "id" TEXT NOT NULL,
    "elderId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "operationalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareAssignment" (
    "id" TEXT NOT NULL,
    "careCaseId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PRIMARY_CAREGIVER',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareVisit" (
    "id" TEXT NOT NULL,
    "careCaseId" TEXT NOT NULL,
    "assignedEmpId" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "operationalNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTask" (
    "id" TEXT NOT NULL,
    "careCaseId" TEXT NOT NULL,
    "careVisitId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedEmpId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareNote" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "careCaseId" TEXT NOT NULL,
    "careVisitId" TEXT,
    "careTaskId" TEXT,
    "note" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareAssignment_careCaseId_employeeId_startDate_key" ON "CareAssignment"("careCaseId", "employeeId", "startDate");

-- AddForeignKey
ALTER TABLE "CareCase" ADD CONSTRAINT "CareCase_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "Elder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCase" ADD CONSTRAINT "CareCase_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareAssignment" ADD CONSTRAINT "CareAssignment_careCaseId_fkey" FOREIGN KEY ("careCaseId") REFERENCES "CareCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareAssignment" ADD CONSTRAINT "CareAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareVisit" ADD CONSTRAINT "CareVisit_careCaseId_fkey" FOREIGN KEY ("careCaseId") REFERENCES "CareCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareVisit" ADD CONSTRAINT "CareVisit_assignedEmpId_fkey" FOREIGN KEY ("assignedEmpId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_careCaseId_fkey" FOREIGN KEY ("careCaseId") REFERENCES "CareCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_careVisitId_fkey" FOREIGN KEY ("careVisitId") REFERENCES "CareVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_assignedEmpId_fkey" FOREIGN KEY ("assignedEmpId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_careCaseId_fkey" FOREIGN KEY ("careCaseId") REFERENCES "CareCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_careVisitId_fkey" FOREIGN KEY ("careVisitId") REFERENCES "CareVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_careTaskId_fkey" FOREIGN KEY ("careTaskId") REFERENCES "CareTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

