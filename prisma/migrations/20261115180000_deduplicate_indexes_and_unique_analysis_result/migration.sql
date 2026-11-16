-- DropIndex
DROP INDEX IF EXISTS "analysis_results_productId_ruleVersion_idx";

-- DropIndex
DROP INDEX IF EXISTS "product_barcodes_barcode_idx";

-- DropIndex
DROP INDEX IF EXISTS "products_barcode_idx";

-- DropIndex
DROP INDEX IF EXISTS "products_productCode_idx";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "analysis_results_productId_ruleVersion_key" ON "analysis_results"("productId", "ruleVersion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");
