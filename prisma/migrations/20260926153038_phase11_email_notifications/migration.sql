-- CreateTable
CREATE TABLE "EmailNotification" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailNotification_entityType_entityId_idx" ON "EmailNotification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "EmailNotification_status_idx" ON "EmailNotification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailNotification_idempotencyKey_recipientEmail_key" ON "EmailNotification"("idempotencyKey", "recipientEmail");
