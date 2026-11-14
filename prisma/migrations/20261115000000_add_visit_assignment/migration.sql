-- CreateTable
CREATE TABLE "VisitAssignment" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "VisitAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitAssignment_visitId_employeeId_key"
ON "VisitAssignment"("visitId", "employeeId");

-- AddForeignKey
ALTER TABLE "VisitAssignment"
ADD CONSTRAINT "VisitAssignment_visitId_fkey"
FOREIGN KEY ("visitId") REFERENCES "CareVisit"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitAssignment"
ADD CONSTRAINT "VisitAssignment_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
