-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MemberProfile_mobileNumber_idx" ON "MemberProfile"("mobileNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Inquiry_status_createdAt_idx" ON "Inquiry"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Receipt_userId_createdAt_idx" ON "Receipt"("userId", "createdAt" DESC);
