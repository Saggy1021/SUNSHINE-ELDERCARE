-- CreateTable: CommunityEvent
CREATE TABLE IF NOT EXISTS "CommunityEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "venue" TEXT NOT NULL,
    "imageUrl" TEXT,
    "visibleToAll" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CommunityEvent_status_eventDate_idx" ON "CommunityEvent"("status", "eventDate");

-- CreateTable: MemberComplaint
CREATE TABLE IF NOT EXISTS "MemberComplaint" (
    "id" TEXT NOT NULL,
    "complaintNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "memberPhone" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminResponse" TEXT,
    "internalNotes" TEXT,
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MemberComplaint_complaintNumber_key" ON "MemberComplaint"("complaintNumber");
CREATE INDEX IF NOT EXISTS "MemberComplaint_userId_createdAt_idx" ON "MemberComplaint"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "MemberComplaint_status_createdAt_idx" ON "MemberComplaint"("status", "createdAt" DESC);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MemberComplaint_userId_fkey'
    ) THEN
        ALTER TABLE "MemberComplaint" ADD CONSTRAINT "MemberComplaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: ComplaintSequence
CREATE TABLE IF NOT EXISTS "ComplaintSequence" (
    "id" TEXT NOT NULL DEFAULT 'CMP_SEQ',
    "current" INTEGER NOT NULL DEFAULT 1001,

    CONSTRAINT "ComplaintSequence_pkey" PRIMARY KEY ("id")
);

-- Insert initial sequence if not exists
INSERT INTO "ComplaintSequence" ("id", "current")
VALUES ('CMP_SEQ', 1001)
ON CONFLICT ("id") DO NOTHING;
