-- CreateTable: PublishedApp
CREATE TABLE IF NOT EXISTS "PublishedApp" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'ANDROID',
    "category" TEXT NOT NULL DEFAULT 'HEALTH_AND_FITNESS',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PublishedApp_slug_key" ON "PublishedApp"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "PublishedApp_packageName_key" ON "PublishedApp"("packageName");
CREATE INDEX IF NOT EXISTS "PublishedApp_isPublished_isArchived_idx" ON "PublishedApp"("isPublished", "isArchived");
CREATE INDEX IF NOT EXISTS "PublishedApp_packageName_idx" ON "PublishedApp"("packageName");

-- CreateTable: AppRelease
CREATE TABLE IF NOT EXISTS "AppRelease" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "versionCode" INTEGER NOT NULL,
    "apkUrl" TEXT NOT NULL,
    "apkFileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "certificateFingerprint" TEXT,
    "minAndroidVersion" TEXT NOT NULL DEFAULT 'Android 10 (API 29)',
    "targetSdkVersion" INTEGER DEFAULT 36,
    "releaseNotes" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AppRelease_appId_versionCode_key" ON "AppRelease"("appId", "versionCode");
CREATE INDEX IF NOT EXISTS "AppRelease_appId_isPublished_releasedAt_idx" ON "AppRelease"("appId", "isPublished", "releasedAt" DESC);

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AppRelease_appId_fkey'
  ) THEN
    ALTER TABLE "AppRelease" ADD CONSTRAINT "AppRelease_appId_fkey" FOREIGN KEY ("appId") REFERENCES "PublishedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
