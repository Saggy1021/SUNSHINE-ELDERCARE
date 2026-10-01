-- AlterTable
ALTER TABLE "MemberDocument" ADD COLUMN     "sha256" TEXT,
ADD COLUMN     "storageObjectId" TEXT,
ADD COLUMN     "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL';
