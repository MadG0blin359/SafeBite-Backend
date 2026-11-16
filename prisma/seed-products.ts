import fs from "fs";
import path from "path";
import { createRequire } from "module";
import {
  PrismaClient,
  ContaminantType,
  EvidenceLevel,
} from "@prisma/client";
import { RAW_CATEGORY_TO_DB_CATEGORY } from "./mappings/product-categories.mapping.js";
import {
  RECOVERED_OFF_BARCODES,
  RESTORED_UPCA_BARCODES,
  BULK_LOOSE_COMMODITY_CODES,
} from "./mappings/barcode-recovery.mapping.js";
import { safetyEngineService } from "../src/services/safety-engine.service.js";
import { logger } from "../src/utils/logger.js";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const DATA_DIR = path.resolve(process.cwd(), "prisma/data/products");
const REVIEW4_FILE = path.join(DATA_DIR, "safebite_clean_data_review4.xlsx");
const BARCODE_FILE = path.join(DATA_DIR, "SafeBite_Food_Products_Barcode_CLEANED.xlsx");

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

  console.log("   📂 Reading products workbooks from disk...");
  const wbReview4 = XLSX.readFile(REVIEW4_FILE);
  const wbBarcode = XLSX.readFile(BARCODE_FILE);

  const rawSources: any[] = XLSX.utils.sheet_to_json(wbReview4.Sheets["sources"], { defval: null });
  const rawProducts: any[] = XLSX.utils.sheet_to_json(wbReview4.Sheets["products"], { defval: null });
  const rawMeasurements: any[] = XLSX.utils.sheet_to_json(wbReview4.Sheets["measurements"], { defval: null });
  const rawDetailedBarcodes: any[] = XLSX.utils.sheet_to_json(wbBarcode.Sheets["Detailed_Matched_Barcodes"], {
    defval: null,
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
    }
  >();

  for (const [barcode, candidates] of barcodeToRows.entries()) {
    const chosen = resolveBestCandidate(candidates);
    const format = barcode.length === 12 ? "UPC_A" : "EAN_13";
    resolvedBarcodeMap.set(barcode, {
      productId: Number(chosen.Product_ID),
      productName: String(chosen.Product_Name_OFF_Clean || "").trim(),
      packaging: String(chosen.Quantity_Cleaned || "").trim(),
      sourceUrl: String(chosen.Open_Food_Facts_URL || "").trim(),
      format,
    });
  }

  // Add 10 Restored UPC-A barcodes (5 products)
  const codeToProductRow = new Map(rawProducts.map((p) => [String(p.product_code).trim(), p]));
  for (const r of RESTORED_UPCA_BARCODES) {
    const p = codeToProductRow.get(r.productCode);
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

  // Add 12 Recovered OFF items
  for (const rec of RECOVERED_OFF_BARCODES) {
    const p = codeToProductRow.get(rec.productCode);
    if (p) {
      for (const bc of rec.barcodes) {
        if (!resolvedBarcodeMap.has(bc)) {
          resolvedBarcodeMap.set(bc, {
            productId: Number(p.product_id),
            productName: rec.offRecordName,
            packaging: "Standard Retail Pack",
            sourceUrl: `https://world.openfoodfacts.org/product/${bc}`,
            format: bc.length === 12 ? "UPC_A" : "EAN_13",
          });
        }
      }
    }
  }

  // Build product_id -> primary barcode map (first unique barcode)
  const productToPrimaryBarcode = new Map<number, string>();
  const assignedPrimaryBarcodes = new Set<string>();

  for (const [barcode, info] of resolvedBarcodeMap.entries()) {
    if (!productToPrimaryBarcode.has(info.productId) && !assignedPrimaryBarcodes.has(barcode)) {
      productToPrimaryBarcode.set(info.productId, barcode);
      assignedPrimaryBarcodes.add(barcode);
    }
  }

  // 3. Ingest Products (549 samples from review4)
  console.log(`   📦 Ingesting ${rawProducts.length} food products...`);
  const productIdMap = new Map<number, string>(); // review4 product_id -> DB UUID
  const productCodeMap = new Map<string, string>(); // review4 product_code -> DB UUID

  for (const p of rawProducts) {
    const review4Id = Number(p.product_id);
    const productCode = String(p.product_code).trim();
    const rawCat = String(p.category || "").trim();
    const canonicalCatName = RAW_CATEGORY_TO_DB_CATEGORY[rawCat] || "Processed Fruit & Sauces";
    const categoryId = categoryMap.get(canonicalCatName);

    if (!categoryId) {
      throw new Error(`Category "${canonicalCatName}" not found in DB categoryMap`);
    }

    const isBulkCommodity = BULK_LOOSE_COMMODITY_CODES.has(productCode);
    const matrix = isBulkCommodity
      ? "loose_bulk"
      : p.concentration_basis === "mg/L"
      ? "liquid"
      : "solid";

    const primaryBarcode = productToPrimaryBarcode.get(review4Id) || null;
    const brand = p.brand && String(p.brand).trim() !== "" ? String(p.brand).trim() : "Unbranded / Open Market";
    const name = String(p.product_name || `Product ${productCode}`).trim();

    const productData = {
      productCode,
      barcode: primaryBarcode,
      name,
      brand,
      categoryId,
      packageSize: p.n_samples ? `${p.n_samples} samples collected` : null,
      matrix,
    };

    const upserted = await prisma.product.upsert({
      where: { productCode },
      update: productData,
      create: productData,
    });

    productIdMap.set(review4Id, upserted.id);
    productCodeMap.set(productCode, upserted.id);
  }

  // 4. Ingest Product Barcodes into `product_barcodes`
  console.log(`   🛒 Ingesting ${resolvedBarcodeMap.size} unique retail barcodes...`);
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

  // 6. Precompute Safety Analyses for all Products
  console.log(`   ⚙️  Precomputing deterministic safety analysis results for products...`);
  let analysesCalculated = 0;

  for (const [review4Id, dbProductId] of productIdMap.entries()) {
    try {
      const result = await safetyEngineService.analyzeProduct(dbProductId);
      if (result) {
        analysesCalculated++;
      }
    } catch (err) {
      logger.warn(`Failed safety analysis for product ${review4Id} (${dbProductId}):`, (err as Error).message);
    }
  }

  console.log(`   ⭐ Successfully precomputed ${analysesCalculated} safety analyses & grades.`);

  return {
    sourcesIngested: rawSources.length,
    productsIngested: rawProducts.length,
    barcodesIngested,
    measurementsIngested,
    analysesCalculated,
  };
}
