-- DropIndex
DROP INDEX "reference_standards_authority_standardCode_contaminant_cate_key";

-- AlterTable
ALTER TABLE "reference_standards" ADD COLUMN     "externalRecordId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reference_standards_externalRecordId_key" ON "reference_standards"("externalRecordId");

-- CreateIndex
CREATE INDEX "reference_standards_categoryId_contaminant_authority_refere_idx" ON "reference_standards"("categoryId", "contaminant", "authority", "referenceRole");

-- CreateIndex
CREATE INDEX "reference_standards_standardCode_idx" ON "reference_standards"("standardCode");

