-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('COMMERCIAL_PACKAGED', 'INFORMAL_WRAPPED', 'LOOSE_COMMODITY', 'RESEARCH_BENCHMARK');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "isConsumerFacing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'COMMERCIAL_PACKAGED';

-- CreateIndex
CREATE INDEX "products_productType_idx" ON "products"("productType");

-- CreateIndex
CREATE INDEX "products_isConsumerFacing_idx" ON "products"("isConsumerFacing");
