import fs from "fs";
import path from "path";
import { createRequire } from "module";
import {
  PrismaClient,
  ContaminantType,
  EvidenceLevel,
  ProductType,
} from "@prisma/client";
import { RAW_CATEGORY_TO_DB_CATEGORY } from "./mappings/product-categories.mapping.js";
import {
  RECOVERED_OFF_BARCODES,
  RESTORED_UPCA_BARCODES,
  INFORMAL_WRAPPED_CANDY_CODES,
  TRUE_LOOSE_COMMODITY_CODES,
  DUPLICATE_PRODUCT_MERGES,
  NON_CONSUMER_RESEARCH_PREFIXES,
} from "./mappings/barcode-recovery.mapping.js";
import { normalizeProductDisplay } from "./mappings/product-display.mapping.js";
import { safetyEngineService } from "../src/services/safety-engine.service.js";
import { standardResolverService } from "../src/services/standard-resolver.service.js";
import { cleanBarcode, isValidGtin } from "../src/utils/barcode.utils.js";
import { logger } from "../src/utils/logger.js";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const DATA_DIR = path.resolve(process.cwd(), "prisma/data/products");
const REVIEW4_FILE = path.join(DATA_DIR, "safebite_clean_data_review4.xlsx");
const BARCODE_FILE = path.join(DATA_DIR, "SafeBite_Food_Products_Barcode_CLEANED.xlsx");
const FILLED_VARIANTS_FILE = path.join(DATA_DIR, "SafeBite_Postgres_Seed_Workbook_Filled.xlsx");

const METAL_TO_CONTAMINANT: Record<string, ContaminantType> = {
  Pb: ContaminantType.LEAD,
  Cd: ContaminantType.CADMIUM,
  Cr: ContaminantType.CHROMIUM,
  Co: ContaminantType.COBALT,
  Cu: ContaminantType.COPPER,
};

export interface SeedProductsSummary {
  sourcesIngested: number;
  productsIngested: number;
  barcodesIngested: number;
  measurementsIngested: number;
  analysesCalculated: number;
}

/**
 * Derives canonical barcode format string from a validated digit-only GTIN length.
 */
function resolveBarcodeFormat(gtin: string): string {
  switch (gtin.length) {
    case 8:
      return "EAN_8";
    case 12:
      return "UPC_A";
    case 13:
      return "EAN_13";
    case 14:
      return "GTIN_14";
    default:
      return "EAN_13";
  }
}

/**
 * Composes human-readable packaging string from Product_Variants columns
 * (e.g. "200 ml carton", "370 g glass jar", "carton", or "" when absent).
 */
function formatVariantPackaging(row: any): string {
  const sizeVal =
    row.pack_size_value !== null && row.pack_size_value !== undefined
      ? String(row.pack_size_value).trim()
      : "";
  const sizeUnit =
    row.pack_size_unit !== null && row.pack_size_unit !== undefined
      ? String(row.pack_size_unit).trim()
      : "";
  const packType =
    row.packaging_type !== null && row.packaging_type !== undefined
      ? String(row.packaging_type).trim()
      : "";

  const sizePart = sizeVal && sizeUnit ? `${sizeVal} ${sizeUnit}` : null;
  return [sizePart, packType || null].filter(Boolean).join(" ");
}

/**
 * Resolves the best product candidate for barcodes that matched multiple sample lines.
 */
function resolveBestCandidate(candidates: any[]): any {
  if (candidates.length === 1) return candidates[0];

  // 1. Exact flavor match priority
  const exacts = candidates.filter((c) => c.Match_Accuracy === "Exact Flavor & Product Match");
  if (exacts.length === 1) return exacts[0];
  const pool = exacts.length > 0 ? exacts : candidates;

  // 2. Score by keyword affinity between OFF Product Name and Candidate Category / Sample Name
  let bestScore = -999;
  let bestCandidate = pool[0];

  for (const c of pool) {
    const offName = String(c.Product_Name_OFF_Clean || "").toLowerCase();
    const offBrand = String(c.Brand_OFF_Clean || "").toLowerCase();
    const cat = String(c.Category || "").toLowerCase();
    const sample = String(c.Sample_Name || "").toLowerCase();
    const brand = String(c.Brand_Company || "").toLowerCase();

    let score = 0;
    const catWords = cat.split(/[\s,&/]+/).filter((w) => w.length > 2);
    for (const cw of catWords) {
      if (offName.includes(cw)) score += 5;
    }

    const sampleWords = sample.split(/[\s,&/]+/).filter((w) => w.length > 2);
    for (const sw of sampleWords) {
      if (offName.includes(sw)) score += 3;
    }

    if (offBrand.includes(brand) || brand.includes(offBrand)) {
      score += 2;
    }

    // Penalties for cross-category confusion
    if (offName.includes("sauce") && cat.includes("noodle")) score -= 15;
    if (offName.includes("ketchup") && cat.includes("noodle")) score -= 15;
    if (offName.includes("noodle") && cat.includes("sauce")) score -= 15;
    if (offName.includes("juice") && cat.includes("pickle")) score -= 15;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = c;
    }
  }

  return bestCandidate;
}

export async function seedProducts(
  prisma: PrismaClient,
  categoryMap: Map<string, string>
): Promise<SeedProductsSummary> {
  if (!fs.existsSync(REVIEW4_FILE)) {
    throw new Error(`Authoritative review4 dataset not found at: ${REVIEW4_FILE}`);
  }
  if (!fs.existsSync(BARCODE_FILE)) {
    throw new Error(`Cleaned barcode dataset not found at: ${BARCODE_FILE}`);
  }
  if (!fs.existsSync(FILLED_VARIANTS_FILE)) {
    throw new Error(`Filled product variants workbook not found at: ${FILLED_VARIANTS_FILE}`);
  }

  console.log("   📂 Reading products workbooks from disk...");
  const wbReview4 = XLSX.readFile(REVIEW4_FILE);
  const wbBarcode = XLSX.readFile(BARCODE_FILE);
  const wbFilledVariants = XLSX.readFile(FILLED_VARIANTS_FILE);

  const rawSources: any[] = XLSX.utils.sheet_to_json(wbReview4.Sheets["sources"], { defval: null });
  const rawProducts: any[] = XLSX.utils.sheet_to_json(wbReview4.Sheets["products"], { defval: null });
  const rawMeasurements: any[] = XLSX.utils.sheet_to_json(wbReview4.Sheets["measurements"], { defval: null });
  const rawDetailedBarcodes: any[] = XLSX.utils.sheet_to_json(wbBarcode.Sheets["Detailed_Matched_Barcodes"], {
    defval: null,
  });
  const productVariantsSheet = wbFilledVariants.Sheets["Product_Variants"];
  if (!productVariantsSheet) {
    throw new Error(`Sheet "Product_Variants" not found in: ${FILLED_VARIANTS_FILE}`);
  }
  // raw: false preserves text-formatted GTINs with leading zeros (e.g. "0710535417227" on TEA-032)
  const rawProductVariants: any[] = XLSX.utils.sheet_to_json(productVariantsSheet, {
    defval: null,
    raw: false,
  });

  // Clean up any legacy unkeyed mock products or sources from pre-migration seeds
  await prisma.product.deleteMany({ where: { productCode: null } });
  await prisma.researchSource.deleteMany({ where: { externalSourceId: null } });

  // 1. Ingest Research Literature Sources (1..38)
  console.log(`   📚 Ingesting ${rawSources.length} peer-reviewed research sources...`);
  const sourceIdMap = new Map<number, string>(); // externalSourceId -> DB UUID

  for (const s of rawSources) {
    const externalSourceId = Number(s.source_id);
    const pubYear = s.publication_year ? parseInt(String(s.publication_year), 10) : 2020;

    const sourceData = {
      externalSourceId,
      title: String(s.title || `Research Source ${externalSourceId}`).trim(),
      authors: String(s.authors || "Research Team").trim(),
      publicationYear: isNaN(pubYear) ? 2020 : pubYear,
      journal: s.journal ? String(s.journal).trim() : null,
      location: s.country_location ? String(s.country_location).trim() : null,
      methodology: s.method ? String(s.method).trim() : null,
      doi: s.doi ? String(s.doi).trim() : null,
      url: s.source_url ? String(s.source_url).trim() : null,
    };

    const upserted = await prisma.researchSource.upsert({
      where: { externalSourceId },
      update: sourceData,
      create: sourceData,
    });

    sourceIdMap.set(externalSourceId, upserted.id);
  }

  // 2. Prepare Barcode Mappings & Disambiguation
  console.log("   🏷️  Preparing barcode disambiguation & recovery layers...");
  const validDetailed = rawDetailedBarcodes.filter((d) => d.Barcode_Valid === "Yes");
  const barcodeToRows = new Map<string, any[]>();

  for (const r of validDetailed) {
    const b = String(r.Barcode).trim();
    if (!barcodeToRows.has(b)) barcodeToRows.set(b, []);
    barcodeToRows.get(b)!.push(r);
  }

  // Map of barcode -> resolved product_id (from review4)
  const resolvedBarcodeMap = new Map<
    string,
    {
      productId: number;
      productName: string;
      packaging: string;
      sourceUrl: string;
      format: string;
      isReviewCandidate?: boolean;
    }
  >();

  // Tier 1 (lowest priority): Broad OFF Detailed_Matched_Barcodes
  for (const [barcode, candidates] of barcodeToRows.entries()) {
    const chosen = resolveBestCandidate(candidates);
    resolvedBarcodeMap.set(barcode, {
      productId: Number(chosen.Product_ID),
      productName: String(chosen.Product_Name_OFF_Clean || "").trim(),
      packaging: String(chosen.Quantity_Cleaned || "").trim(),
      sourceUrl: String(chosen.Open_Food_Facts_URL || "").trim(),
      format: resolveBarcodeFormat(barcode),
    });
  }

  // Build lookup map & protected barcode set (Tier 2 & Tier 4 must never be overridden by Tier 3)
  const codeToProductRow = new Map(rawProducts.map((p) => [String(p.product_code).trim(), p]));
  const protectedBarcodes = new Set<string>();
  for (const r of RESTORED_UPCA_BARCODES) {
    protectedBarcodes.add(cleanBarcode(r.restoredUpcA));
  }
  for (const rec of RECOVERED_OFF_BARCODES) {
    for (const bc of rec.barcodes) {
      protectedBarcodes.add(cleanBarcode(bc));
    }
  }

  // Tier 2: Add 10 Restored UPC-A barcodes (5 products)
  for (const r of RESTORED_UPCA_BARCODES) {
    const canonicalCode = DUPLICATE_PRODUCT_MERGES[r.productCode] ?? r.productCode;
    const p = codeToProductRow.get(canonicalCode);
    if (p) {
      resolvedBarcodeMap.set(r.restoredUpcA, {
        productId: Number(p.product_id),
        productName: r.brandAndProduct,
        packaging: "Restored retail pack",
        sourceUrl: "https://world.openfoodfacts.org",
        format: "UPC_A",
      });
    }
  }

  // Tier 3: Ingest researched Product_Variants from SafeBite_Postgres_Seed_Workbook_Filled.xlsx
  // Overrides Tier 1 broad matches (e.g. fixing 5 MILK-006/MILK-008 Fruita Vitals hijacks)
  // while strictly preserving Tier 2 (RESTORED_UPCA_BARCODES) and Tier 4 (RECOVERED_OFF_BARCODES).
  const seenVariantBarcodes = new Set<string>();
  let variantsIngested = 0;
  let variantsReassigned = 0;
  let variantsSkippedNoGtin = 0;
  let variantsRejectedInvalid = 0;
  let variantsSkippedProtected = 0;
  let variantsSkippedDuplicate = 0;
  let variantsSkippedUnknownProduct = 0;

  for (const v of rawProductVariants) {
    const rawGtin = v.gtin !== null && v.gtin !== undefined ? String(v.gtin).trim() : "";
    if (!rawGtin) {
      variantsSkippedNoGtin++;
      continue;
    }

    const gtin = cleanBarcode(rawGtin);
    if (!/^\d+$/.test(gtin) || !isValidGtin(gtin)) {
      variantsRejectedInvalid++;
      logger.warn(
        `Rejected invalid GTIN "${rawGtin}" in Product_Variants for product_code "${v.product_code}"`
      );
      continue;
    }

    if (protectedBarcodes.has(gtin)) {
      variantsSkippedProtected++;
      continue;
    }

    if (seenVariantBarcodes.has(gtin)) {
      variantsSkippedDuplicate++;
      logger.warn(`Skipped duplicate GTIN "${gtin}" in Product_Variants`);
      continue;
    }

    const rawCode = v.product_code !== null && v.product_code !== undefined ? String(v.product_code).trim() : "";
    const canonicalCode = DUPLICATE_PRODUCT_MERGES[rawCode] ?? rawCode;
    const p = codeToProductRow.get(canonicalCode);
    if (!p) {
      variantsSkippedUnknownProduct++;
      logger.warn(`Skipped GTIN "${gtin}" in Product_Variants: unknown product_code "${rawCode}"`);
      continue;
    }

    seenVariantBarcodes.add(gtin);
    if (resolvedBarcodeMap.has(gtin)) {
      variantsReassigned++;
    }

    const verificationStatus = String(v.verification_status || "").trim().toLowerCase();
    resolvedBarcodeMap.set(gtin, {
      productId: Number(p.product_id),
      productName: v.variant_name ? String(v.variant_name).trim() : "",
      packaging: formatVariantPackaging(v),
      sourceUrl: v.source_url ? String(v.source_url).trim() : "",
      format: resolveBarcodeFormat(gtin),
      isReviewCandidate: verificationStatus === "review_required_candidate",
    });
    variantsIngested++;
  }

  console.log(
    `   📊 Product_Variants: ${variantsIngested} valid GTINs ingested (` +
      `${variantsReassigned} broad-match collisions reassigned, ` +
      `${variantsSkippedNoGtin} no-GTIN metadata rows skipped, ` +
      `${variantsRejectedInvalid} invalid rejected, ` +
      `${variantsSkippedProtected} protected, ` +
      `${variantsSkippedDuplicate} duplicate, ` +
      `${variantsSkippedUnknownProduct} unknown product_code)`
  );

  // Tier 4 (highest priority): Add Authoritative Recovered OFF items (FORCIBLY overrides broad parent-brand OFF collisions
  // e.g. MILK-008 hijacking Cerelac/NAN/Nesfruta, JU1 hijacking Nesfruta Mango, MILK-011 hijacking Kashmiri Tea)
  for (const rec of RECOVERED_OFF_BARCODES) {
    const canonicalCode = DUPLICATE_PRODUCT_MERGES[rec.productCode] ?? rec.productCode;
    const p = codeToProductRow.get(canonicalCode);
    if (p) {
      for (const bc of rec.barcodes) {
        resolvedBarcodeMap.set(bc, {
          productId: Number(p.product_id),
          productName: rec.offRecordName,
          packaging: "Standard Retail Pack",
          sourceUrl: `https://world.openfoodfacts.org/product/${bc}`,
          format: resolveBarcodeFormat(bc),
        });
      }
    }
  }

  // Re-map any barcodes pointing to a merged duplicate product code onto its canonical product_id
  const duplicateReview4IdToCanonicalId = new Map<number, number>();
  for (const [dupCode, canonicalCode] of Object.entries(DUPLICATE_PRODUCT_MERGES)) {
    const dupRow = codeToProductRow.get(dupCode);
    const canonRow = codeToProductRow.get(canonicalCode);
    if (dupRow && canonRow) {
      duplicateReview4IdToCanonicalId.set(Number(dupRow.product_id), Number(canonRow.product_id));
    }
  }
  for (const [barcode, info] of resolvedBarcodeMap.entries()) {
    const remapped = duplicateReview4IdToCanonicalId.get(info.productId);
    if (remapped !== undefined) {
      resolvedBarcodeMap.set(barcode, { ...info, productId: remapped });
    }
  }

  // Track which review4 product_ids actually have >= 1 tracked heavy metal measurement
  const measuredProductIds = new Set<number>();
  for (const m of rawMeasurements) {
    if (METAL_TO_CONTAMINANT[m.metal]) {
      const pid = Number(m.product_id);
      measuredProductIds.add(duplicateReview4IdToCanonicalId.get(pid) ?? pid);
    }
  }

  // Helper to classify each product into ProductType & isConsumerFacing
  const UNBRANDED_MARKERS = new Set([
    "unbranded / open market",
    "open",
    "local/unbranded",
    "green tea open market",
    "kenya open market",
  ]);

  function classifyProduct(productCode: string, brand: string): {
    productType: ProductType;
    isConsumerFacing: boolean;
  } {
    const prefix = productCode.split("-")[0];
    if (NON_CONSUMER_RESEARCH_PREFIXES.has(prefix)) {
      return { productType: ProductType.RESEARCH_BENCHMARK, isConsumerFacing: false };
    }
    if (INFORMAL_WRAPPED_CANDY_CODES.has(productCode)) {
      return { productType: ProductType.INFORMAL_WRAPPED, isConsumerFacing: true };
    }
    const bLower = brand.toLowerCase().trim();
    const isUnbranded =
      UNBRANDED_MARKERS.has(bLower) ||
      bLower.includes("unbranded") ||
      bLower.includes("open market");
    if (TRUE_LOOSE_COMMODITY_CODES.has(productCode) || isUnbranded) {
      return { productType: ProductType.LOOSE_COMMODITY, isConsumerFacing: true };
    }
    return { productType: ProductType.COMMERCIAL_PACKAGED, isConsumerFacing: true };
  }

  // Build product_id -> primary barcode map
  // Pass 1: prefer verified / non-review-candidate barcodes
  // Pass 2: fall back to review_required_candidate barcodes if a product has no other GTIN (e.g. JU26)
  const productToPrimaryBarcode = new Map<number, string>();
  const assignedPrimaryBarcodes = new Set<string>();

  for (const [barcode, info] of resolvedBarcodeMap.entries()) {
    if (info.isReviewCandidate) continue;
    if (!productToPrimaryBarcode.has(info.productId) && !assignedPrimaryBarcodes.has(barcode)) {
      productToPrimaryBarcode.set(info.productId, barcode);
      assignedPrimaryBarcodes.add(barcode);
    }
  }
  for (const [barcode, info] of resolvedBarcodeMap.entries()) {
    if (!info.isReviewCandidate) continue;
    if (!productToPrimaryBarcode.has(info.productId) && !assignedPrimaryBarcodes.has(barcode)) {
      productToPrimaryBarcode.set(info.productId, barcode);
      assignedPrimaryBarcodes.add(barcode);
    }
  }

  // Determine which rawProducts are excluded (4 merged duplicates + 22 zero-data research placeholders)
  const excludedProductCodes = new Set<string>(Object.keys(DUPLICATE_PRODUCT_MERGES));
  const activeRawProducts: any[] = [];
  let purgedZeroDataCount = 0;

  for (const p of rawProducts) {
    const productCode = String(p.product_code).trim();
    const review4Id = Number(p.product_id);
    if (DUPLICATE_PRODUCT_MERGES[productCode]) {
      continue; // Merged into canonical product
    }
    const brand =
      p.brand && String(p.brand).trim() !== ""
        ? String(p.brand).trim()
        : "Unbranded / Open Market";
    const { productType } = classifyProduct(productCode, brand);

    if (productType === ProductType.RESEARCH_BENCHMARK && !measuredProductIds.has(review4Id)) {
      excludedProductCodes.add(productCode);
      purgedZeroDataCount++;
      continue; // Purge zero-research-data academic placeholders
    }
    activeRawProducts.push(p);
  }

  // Clean up merged duplicates & purged zero-data placeholders safely from DB (cascade children first)
  if (excludedProductCodes.size > 0) {
    const toDelete = await prisma.product.findMany({
      where: { productCode: { in: Array.from(excludedProductCodes) } },
      select: { id: true },
    });
    const deleteIds = toDelete.map((d) => d.id);
    if (deleteIds.length > 0) {
      await prisma.analysisResult.deleteMany({ where: { productId: { in: deleteIds } } });
      await prisma.researchData.deleteMany({ where: { productId: { in: deleteIds } } });
      await prisma.productBarcode.deleteMany({ where: { productId: { in: deleteIds } } });
      await prisma.product.deleteMany({ where: { id: { in: deleteIds } } });
    }
    console.log(
      `   🧹 Removed ${Object.keys(DUPLICATE_PRODUCT_MERGES).length} merged duplicate SKUs and purged ${purgedZeroDataCount} zero-data research placeholders.`
    );
  }

  // Reset primary barcodes before upsert so reassigned barcodes (e.g. MILK-008 -> BBF-S13) never hit @unique collisions
  await prisma.product.updateMany({ data: { barcode: null } });

  // 3. Ingest Active Products (deduplicated & classified)
  console.log(`   📦 Ingesting ${activeRawProducts.length} food products...`);
  const productIdMap = new Map<number, string>(); // review4 product_id -> DB UUID
  const productCodeMap = new Map<string, string>(); // review4 product_code -> DB UUID

  for (const p of activeRawProducts) {
    const review4Id = Number(p.product_id);
    const productCode = String(p.product_code).trim();
    const rawCat = String(p.category || "").trim();
    const canonicalCatName = RAW_CATEGORY_TO_DB_CATEGORY[rawCat] || "Processed Fruit & Sauces";
    const categoryId = categoryMap.get(canonicalCatName);

    if (!categoryId) {
      throw new Error(`Category "${canonicalCatName}" not found in DB categoryMap`);
    }

    const rawBrand = p.brand && String(p.brand).trim() !== "" ? String(p.brand).trim() : "Unbranded / Open Market";
    const rawName = String(p.product_name || `Product ${productCode}`).trim();
    const { productType, isConsumerFacing } = classifyProduct(productCode, rawBrand);
    const { brand, name } = normalizeProductDisplay(productCode, rawBrand, rawName);

    const matrix = INFORMAL_WRAPPED_CANDY_CODES.has(productCode)
      ? "informal_wrapped"
      : TRUE_LOOSE_COMMODITY_CODES.has(productCode)
      ? "loose_bulk"
      : p.concentration_basis === "mg/L"
      ? "liquid"
      : "solid";

    const primaryBarcode = productToPrimaryBarcode.get(review4Id) || null;

    const productData = {
      productCode,
      barcode: primaryBarcode,
      name,
      brand,
      categoryId,
      packageSize: p.n_samples ? `${p.n_samples} samples collected` : null,
      matrix,
      productType,
      isConsumerFacing,
    };

    const upserted = await prisma.product.upsert({
      where: { productCode },
      update: productData,
      create: productData,
    });

    productIdMap.set(review4Id, upserted.id);
    productCodeMap.set(productCode, upserted.id);
  }

  // Map merged duplicate review4 IDs -> canonical product DB UUID so all duplicate measurements are preserved!
  for (const [dupId, canonId] of duplicateReview4IdToCanonicalId.entries()) {
    const canonUuid = productIdMap.get(canonId);
    if (canonUuid) {
      productIdMap.set(dupId, canonUuid);
    }
  }

  // 4. Ingest Product Barcodes into `product_barcodes` (fresh sync so reassigned ownership is exact)
  console.log(`   🛒 Ingesting ${resolvedBarcodeMap.size} unique retail barcodes...`);
  await prisma.productBarcode.deleteMany({});
  let barcodesIngested = 0;

  for (const [barcode, info] of resolvedBarcodeMap.entries()) {
    const dbProductId = productIdMap.get(info.productId);
    if (!dbProductId) continue;

    const barcodeData = {
      barcode,
      productId: dbProductId,
      format: info.format,
      productName: info.productName || null,
      packaging: info.packaging || null,
      sourceUrl: info.sourceUrl || null,
    };

    await prisma.productBarcode.upsert({
      where: { barcode },
      update: barcodeData,
      create: barcodeData,
    });

    barcodesIngested++;
  }

  // 5. Ingest Heavy Metal Measurements (1,693 measurements for 5 tracked metals)
  console.log(`   🧪 Ingesting heavy metal research measurements...`);
  let measurementsIngested = 0;

  // Clear existing research data for these products to ensure clean idempotent state
  await prisma.researchData.deleteMany({});

  const researchDataRows: any[] = [];

  for (const m of rawMeasurements) {
    const contaminant = METAL_TO_CONTAMINANT[m.metal];
    if (!contaminant) {
      // Skip non-tracked elements (Fe, Zn, etc.)
      continue;
    }

    const review4ProductId = Number(m.product_id);
    const dbProductId = productIdMap.get(review4ProductId);
    const rawProd = rawProducts.find((p) => Number(p.product_id) === review4ProductId);
    if (!rawProd || !dbProductId) continue;

    const rawCat = String(rawProd.category || "").trim();
    const canonicalCatName = RAW_CATEGORY_TO_DB_CATEGORY[rawCat] || "Processed Fruit & Sauces";
    const categoryId = categoryMap.get(canonicalCatName)!;

    const sourceDbId = sourceIdMap.get(Number(rawProd.source_id));
    if (!sourceDbId) continue;

    const concentrationVal =
      m.value !== null && m.value !== undefined && m.value !== "" ? Number(m.value) : null;
    const sdVal = m.sd !== null && m.sd !== undefined && m.sd !== "" ? Number(m.sd) : null;

    let measurementStatus = "MEASURED";
    if (m.qualifier === "ND") {
      measurementStatus = "BELOW_LOD";
    } else if (m.qualifier === "range_max") {
      measurementStatus = "RANGE_VALUE";
    }

    let evidenceLevel = EvidenceLevel.BRAND_LEVEL;
    if (rawProd.evidence_level === "product_level") {
      evidenceLevel = EvidenceLevel.PRODUCT_SPECIFIC;
    } else if (rawProd.evidence_level === "category_level") {
      evidenceLevel = EvidenceLevel.CATEGORY_LEVEL;
    }

    const basis = rawProd.concentration_basis === "mg/L" ? "volume" : "mass";

    researchDataRows.push({
      productId: dbProductId,
      brand: rawProd.brand ? String(rawProd.brand).trim() : null,
      categoryId,
      contaminant,
      concentration: concentrationVal,
      unit: m.unit ? String(m.unit).trim() : "mg/kg",
      basis,
      evidenceLevel,
      measurementStatus,
      rawLOD: null,
      sd: sdVal,
      qualifier: m.qualifier ? String(m.qualifier).trim() : null,
      flag: m.flag ? String(m.flag).trim() : null,
      sourceId: sourceDbId,
    });
  }

  // Insert in batches of 200
  const BATCH_SIZE = 200;
  for (let i = 0; i < researchDataRows.length; i += BATCH_SIZE) {
    const batch = researchDataRows.slice(i, i + BATCH_SIZE);
    await prisma.researchData.createMany({ data: batch });
    measurementsIngested += batch.length;
  }
  console.log(`   ✅ Ingested ${measurementsIngested} heavy metal measurements.`);

  // 6. Precompute Safety Analyses for all active unique Products
  console.log(`   ⚙️  Precomputing deterministic safety analysis results for products...`);
  standardResolverService.clearCache();
  let analysesCalculated = 0;

  const uniqueProductIds = new Set(productIdMap.values());
  for (const dbProductId of uniqueProductIds) {
    try {
      const result = await safetyEngineService.analyzeProduct(dbProductId);
      if (result) {
        analysesCalculated++;
      }
    } catch (err) {
      logger.warn(`Failed safety analysis for product (${dbProductId}):`, (err as Error).message);
    }
  }

  console.log(`   ⭐ Successfully precomputed ${analysesCalculated} safety analyses & grades.`);

  return {
    sourcesIngested: rawSources.length,
    productsIngested: activeRawProducts.length,
    barcodesIngested,
    measurementsIngested,
    analysesCalculated,
  };
}
