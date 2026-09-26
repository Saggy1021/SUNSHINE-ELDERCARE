-- CreateTable
CREATE TABLE "MemberProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "idProofType" TEXT,
    "idProofNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "serviceAddress" TEXT,
    "nearestLandmark" TEXT,
    "mobileNumber" TEXT,
    "alternateNumber" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "alternateNumber" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceDetails" (
    "id" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "coverageAmount" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalAuthorization" (
    "id" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "hospitalForSos" TEXT,
    "nomineeLocalContact" TEXT,
    "shiftAuthorization" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSequence" (
    "id" TEXT NOT NULL DEFAULT 'MEMBER_SEQ',
    "current" INTEGER NOT NULL DEFAULT 1001,

    CONSTRAINT "MemberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_userId_key" ON "MemberProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_memberId_key" ON "MemberProfile"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_memberProfileId_key" ON "Sponsor"("memberProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceDetails_memberProfileId_key" ON "InsuranceDetails"("memberProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalAuthorization_memberProfileId_key" ON "MedicalAuthorization"("memberProfileId");

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceDetails" ADD CONSTRAINT "InsuranceDetails_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalAuthorization" ADD CONSTRAINT "MedicalAuthorization_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
