-- AlterTable
ALTER TABLE "products" ADD COLUMN     "productCode" TEXT;

-- AlterTable
ALTER TABLE "research_data" ADD COLUMN     "flag" TEXT,
ADD COLUMN     "qualifier" TEXT,
ADD COLUMN     "sd" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "research_sources" ADD COLUMN     "externalSourceId" INTEGER;

-- CreateTable
CREATE TABLE "product_barcodes" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "format" TEXT,
    "productName" TEXT,
    "packaging" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_barcode_key" ON "product_barcodes"("barcode");

-- CreateIndex
CREATE INDEX "product_barcodes_barcode_idx" ON "product_barcodes"("barcode");

-- CreateIndex
CREATE INDEX "product_barcodes_productId_idx" ON "product_barcodes"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "products_productCode_key" ON "products"("productCode");

-- CreateIndex
CREATE INDEX "products_productCode_idx" ON "products"("productCode");

-- CreateIndex
CREATE INDEX "research_data_productId_contaminant_idx" ON "research_data"("productId", "contaminant");

-- CreateIndex
CREATE INDEX "research_data_categoryId_contaminant_idx" ON "research_data"("categoryId", "contaminant");

-- CreateIndex
CREATE UNIQUE INDEX "research_sources_externalSourceId_key" ON "research_sources"("externalSourceId");

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
