-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicBiography" TEXT;

-- CreateTable
CREATE TABLE "WebsitePage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "updatedById" TEXT,

    CONSTRAINT "WebsitePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoMetadata" (
    "id" TEXT NOT NULL,
    "websitePageId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "canonicalUrl" TEXT,
    "socialTitle" TEXT,
    "socialDescription" TEXT,
    "socialImage" TEXT,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SeoMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqEntry" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "FaqEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorTitle" TEXT,
    "quote" TEXT NOT NULL,
    "rating" INTEGER DEFAULT 5,
    "image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "WebsiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePage_slug_key" ON "WebsitePage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SeoMetadata_websitePageId_key" ON "SeoMetadata"("websitePageId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteSetting_key_key" ON "WebsiteSetting"("key");

-- AddForeignKey
ALTER TABLE "WebsitePage" ADD CONSTRAINT "WebsitePage_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoMetadata" ADD CONSTRAINT "SeoMetadata_websitePageId_fkey" FOREIGN KEY ("websitePageId") REFERENCES "WebsitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaqEntry" ADD CONSTRAINT "FaqEntry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteSetting" ADD CONSTRAINT "WebsiteSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

