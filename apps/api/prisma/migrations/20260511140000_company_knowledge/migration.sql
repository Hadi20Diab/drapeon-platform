CREATE TABLE "CompanyKnowledgeEntry" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "category" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "pineconeSyncedAt" TIMESTAMP(3),
  "pineconeSyncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompanyKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyKnowledgeEntry_slug_key" ON "CompanyKnowledgeEntry"("slug");
CREATE INDEX "CompanyKnowledgeEntry_isPublished_updatedAt_idx" ON "CompanyKnowledgeEntry"("isPublished", "updatedAt");
CREATE INDEX "CompanyKnowledgeEntry_category_idx" ON "CompanyKnowledgeEntry"("category");
