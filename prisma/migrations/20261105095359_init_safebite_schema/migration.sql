-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "ContaminantType" AS ENUM ('LEAD', 'CADMIUM', 'CHROMIUM', 'COBALT', 'COPPER');

-- CreateEnum
CREATE TYPE "EvidenceLevel" AS ENUM ('PRODUCT_SPECIFIC', 'BRAND_LEVEL', 'CATEGORY_LEVEL');

-- CreateEnum
CREATE TYPE "StandardAuthority" AS ENUM ('PSQCA', 'CODEX', 'EU');

-- CreateEnum
CREATE TYPE "ReferenceRole" AS ENUM ('PRIMARY_NATIONAL', 'INTERNATIONAL_FALLBACK', 'SECONDARY_COMPARISON');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "healthConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "healthTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "packageSize" TEXT,
    "matrix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_sources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "publicationYear" INTEGER NOT NULL,
    "journal" TEXT,
    "location" TEXT,
    "sampleSize" INTEGER,
    "methodology" TEXT,
    "doi" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_data" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "brand" TEXT,
    "categoryId" TEXT NOT NULL,
    "contaminant" "ContaminantType" NOT NULL,
    "concentration" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "evidenceLevel" "EvidenceLevel" NOT NULL,
    "measurementStatus" TEXT NOT NULL,
    "rawLOD" DOUBLE PRECISION,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_standards" (
    "id" TEXT NOT NULL,
    "authority" "StandardAuthority" NOT NULL,
    "standardCode" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "contaminant" "ContaminantType" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "productMatrix" TEXT,
    "limitValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "referenceRole" "ReferenceRole" NOT NULL,
    "notes" TEXT,
    "sourceUrl" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reference_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_results" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "clrBreakdown" JSONB NOT NULL,
    "maxClr" DOUBLE PRECISION,
    "highestContaminant" "ContaminantType",
    "cci" DOUBLE PRECISION,
    "grade" TEXT,
    "gradeEligible" BOOLEAN NOT NULL DEFAULT false,
    "statusText" TEXT NOT NULL,
    "reasonCode" TEXT,
    "eligibleCount" INTEGER NOT NULL DEFAULT 0,
    "testedCount" INTEGER NOT NULL DEFAULT 0,
    "excludedReasons" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_context_evidence" (
    "id" TEXT NOT NULL,
    "contaminant" "ContaminantType" NOT NULL,
    "tag" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidenceStrength" TEXT NOT NULL,
    "sourceCitation" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_context_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exposure_reduction_guidance" (
    "id" TEXT NOT NULL,
    "clrBand" TEXT NOT NULL,
    "guidanceText" TEXT NOT NULL,
    "sourceCitation" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exposure_reduction_guidance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vector_store" (
    "id" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vector_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lastKnownGrade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_barcode_idx" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_brand_idx" ON "products"("brand");

-- CreateIndex
CREATE INDEX "research_data_contaminant_idx" ON "research_data"("contaminant");

-- CreateIndex
CREATE INDEX "research_data_evidenceLevel_idx" ON "research_data"("evidenceLevel");

-- CreateIndex
CREATE UNIQUE INDEX "reference_standards_authority_standardCode_contaminant_cate_key" ON "reference_standards"("authority", "standardCode", "contaminant", "categoryId", "productMatrix");

-- CreateIndex
CREATE INDEX "analysis_results_productId_ruleVersion_idx" ON "analysis_results"("productId", "ruleVersion");

-- CreateIndex
CREATE INDEX "vector_store_sourceType_idx" ON "vector_store"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_productId_key" ON "favorites"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_userId_productId_key" ON "watchlist"("userId", "productId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data" ADD CONSTRAINT "research_data_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data" ADD CONSTRAINT "research_data_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_data" ADD CONSTRAINT "research_data_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "research_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_standards" ADD CONSTRAINT "reference_standards_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
