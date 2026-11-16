import { PrismaClient, ContaminantType, StandardAuthority, ReferenceRole } from "@prisma/client";
import { ensureSafeBiteCategories, seedPsqcaStandards } from "./seed-standards.js";
import { seedProducts } from "./seed-products.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SafeBite Database Seeding...");

  // 1. Seed Canonical SafeBite Food Categories
  console.log("1. Seeding SafeBite Food Categories...");
  const categoryMap = await ensureSafeBiteCategories(prisma);

  // 2. Ingest Verified PSQCA Regulatory Standards Matrix from Excel
  console.log("2. Seeding Verified PSQCA Regulatory Standards from Excel...");
  const stdSummary = await seedPsqcaStandards(prisma, categoryMap);
  console.log(
    `   ✅ PSQCA Standards: ${stdSummary.ingestedPsqcaRows} ingested (` +
      `${stdSummary.skippedNonCoreElementRows} non-tracked contaminants skipped, ` +
      `${stdSummary.skippedNonFoodOrGuidelineRows} non-food/guideline rows skipped)`
  );

  // 2b. Seed Codex Fallback & EU Secondary Comparison References (FR-04-03 / Table 8)
  const supplementaryStandards = [
    // Instant Noodles
    {
      externalRecordId: "CXS-193-1995-NOODLES-PB",
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.LEAD,
      categoryName: "Instant Noodles",
      productMatrix: "Instant noodles",
      limitValue: 0.2,
      unit: "mg/kg",
      basis: "dry_mass",
      referenceRole: ReferenceRole.INTERNATIONAL_FALLBACK,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },
    {
      externalRecordId: "CXS-193-1995-NOODLES-CD",
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.CADMIUM,
      categoryName: "Instant Noodles",
      productMatrix: "Instant noodles",
      limitValue: 0.1,
      unit: "mg/kg",
      basis: "dry_mass",
      referenceRole: ReferenceRole.INTERNATIONAL_FALLBACK,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },
    // Packaged Tea & Coffee (Codex CXS 193 & EU 2023/915 Fallbacks)
    {
      externalRecordId: "CXS-193-1995-TEA-PB",
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.LEAD,
      categoryName: "Packaged Tea & Coffee",
      productMatrix: "Tea (green, black, dried)",
      limitValue: 5.0,
      unit: "mg/kg",
      basis: "dry_mass",
      referenceRole: ReferenceRole.INTERNATIONAL_FALLBACK,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },
    {
      externalRecordId: "EU-2023-915-TEA-CD",
      authority: StandardAuthority.EU,
      standardCode: "EU 2023/915",
      version: "2026",
      contaminant: ContaminantType.CADMIUM,
      categoryName: "Packaged Tea & Coffee",
      productMatrix: "Dried tea leaves and herbal infusions",
      limitValue: 0.2,
      unit: "mg/kg",
      basis: "dry_mass",
      referenceRole: ReferenceRole.INTERNATIONAL_FALLBACK,
      sourceUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02023R0915-20260819",
    },
    // Snack Foods & Chips (Codex CXS 193 Fallbacks)
    {
      externalRecordId: "CXS-193-1995-SNACKS-PB",
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.LEAD,
      categoryName: "Snack Foods & Chips",
      productMatrix: "Root and tuber vegetables, potato snacks",
      limitValue: 0.1,
      unit: "mg/kg",
      basis: "mass",
      referenceRole: ReferenceRole.INTERNATIONAL_FALLBACK,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },
    {
      externalRecordId: "CXS-193-1995-SNACKS-CD",
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.CADMIUM,
      categoryName: "Snack Foods & Chips",
      productMatrix: "Root and tuber vegetables, potato snacks",
      limitValue: 0.1,
      unit: "mg/kg",
      basis: "mass",
      referenceRole: ReferenceRole.INTERNATIONAL_FALLBACK,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },
    // Biscuits & Cookies (Codex Cadmium Fallback)
    {
      externalRecordId: "CXS-193-1995-BISCUITS-CD",
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.CADMIUM,
      categoryName: "Biscuits & Cookies",
      productMatrix: "Cereal-based baked goods, biscuits",
      limitValue: 0.1,
      unit: "mg/kg",
      basis: "dry_mass",
      referenceRole: ReferenceRole.INTERNATIONAL_FALLBACK,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },
    // Chocolates & Confectionery (Codex Lead Fallback)
    {
      externalRecordId: "CXS-193-1995-CHOC-PB",
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.LEAD,
      categoryName: "Chocolates & Confectionery",
      productMatrix: "Chocolate and confectionery",
      limitValue: 0.1,
      unit: "mg/kg",
      basis: "mass",
      referenceRole: ReferenceRole.INTERNATIONAL_FALLBACK,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },
    // Secondary Comparison References (EU 2023/915)
    {
      externalRecordId: "EU-2023-915-MILK-PB",
      authority: StandardAuthority.EU,
      standardCode: "EU 2023/915",
      version: "2026",
      contaminant: ContaminantType.LEAD,
      categoryName: "Packaged Liquid Milk",
      productMatrix: "Packaged liquid milk",
      limitValue: 0.02,
      unit: "mg/kg",
      basis: "wet_mass",
      referenceRole: ReferenceRole.SECONDARY_COMPARISON,
      sourceUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02023R0915-20260819",
    },
    {
      externalRecordId: "EU-2023-915-CHOC-CD",
      authority: StandardAuthority.EU,
      standardCode: "EU 2023/915",
      version: "2026",
      contaminant: ContaminantType.CADMIUM,
      categoryName: "Chocolates & Confectionery",
      productMatrix: "Milk chocolate",
      limitValue: 0.1,
      unit: "mg/kg",
      basis: "mass",
      referenceRole: ReferenceRole.SECONDARY_COMPARISON,
      sourceUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02023R0915-20260819",
    },
  ];

  for (const std of supplementaryStandards) {
    const categoryId = categoryMap.get(std.categoryName);
    if (!categoryId) continue;

    const data = {
      externalRecordId: std.externalRecordId,
      authority: std.authority,
      standardCode: std.standardCode,
      version: std.version,
      contaminant: std.contaminant,
      categoryId,
      productMatrix: std.productMatrix,
      limitValue: std.limitValue,
      unit: std.unit,
      basis: std.basis,
      referenceRole: std.referenceRole,
      sourceUrl: std.sourceUrl,
    };

    await prisma.referenceStandard.upsert({
      where: { externalRecordId: std.externalRecordId },
      update: data,
      create: data,
    });
  }

  // Clean up any legacy unkeyed supplementary standards from pre-migration seeds
  await prisma.referenceStandard.deleteMany({
    where: {
      externalRecordId: null,
    },
  });

  // 3. Ingest Research Sources, Products, Retail Barcodes & Chemical Measurements
  console.log("3. Ingesting Research Sources, Products, Retail Barcodes & Chemical Measurements...");
  const prodSummary = await seedProducts(prisma, categoryMap);
  console.log(
    `   ✅ Products Seeded: ${prodSummary.productsIngested} products, ` +
      `${prodSummary.sourcesIngested} research sources, ` +
      `${prodSummary.barcodesIngested} retail barcodes, ` +
      `${prodSummary.measurementsIngested} heavy metal measurements, ` +
      `${prodSummary.analysesCalculated} safety analyses precomputed.`
  );

  // 5. Seed Health-Context Evidence (FR-16, idempotent)
  console.log("5. Seeding Health-Context Evidence Records...");
  if ((await prisma.healthContextEvidence.count()) === 0) {
    await prisma.healthContextEvidence.createMany({
      data: [
        {
          contaminant: ContaminantType.LEAD,
          tag: "PREGNANCY",
          summary:
            "Prenatal lead exposure is linked with reduced gestational age, impaired neurodevelopment, and low birthweight.",
          evidenceStrength: "STRONG",
          sourceCitation: "WHO (2021) Guidelines for Clinical Management of Exposure to Lead",
          reviewer: "SafeBite Medical Advisory Panel",
          reviewDate: new Date("2026-05-15"),
        },
        {
          contaminant: ContaminantType.LEAD,
          tag: "INFANT",
          summary:
            "Young children absorb 4-5 times more ingested lead than adults; even low blood-lead levels irreversibly harm cognitive development.",
          evidenceStrength: "STRONG",
          sourceCitation: "UNICEF Pakistan & MoNHSRC (2026) Child Lead Exposure Study",
          reviewer: "SafeBite Medical Advisory Panel",
          reviewDate: new Date("2026-05-15"),
        },
        {
          contaminant: ContaminantType.CADMIUM,
          tag: "KIDNEY_ISSUE",
          summary:
            "Cadmium accumulates in the renal cortex and can exacerbate pre-existing renal tubular dysfunction.",
          evidenceStrength: "STRONG",
          sourceCitation: "EFSA Panel on Contaminants in the Food Chain (CONTAM)",
          reviewer: "SafeBite Medical Advisory Panel",
          reviewDate: new Date("2026-06-01"),
        },
      ],
    });
  }

  // 6. Seed Exposure-Reduction Guidance (FR-17, idempotent)
  console.log("6. Seeding Exposure-Reduction Guidance Records...");
  if ((await prisma.exposureReductionGuidance.count()) === 0) {
    await prisma.exposureReductionGuidance.createMany({
      data: [
        {
          clrBand: "BELOW_LIMIT",
          guidanceText:
            "Reported concentrations are below applicable regulatory limits. Maintain a balanced, diverse diet.",
          sourceCitation: "Codex Alimentarius Food Safety Recommendations",
          reviewer: "SafeBite Nutrition Working Group",
          reviewDate: new Date("2026-04-10"),
        },
        {
          clrBand: "CLOSE_TO_LIMIT",
          guidanceText:
            "Reported levels approach regulatory thresholds. Consider moderating consumption frequency, especially for children.",
          sourceCitation: "WHO General Precautionary Principles",
          reviewer: "SafeBite Nutrition Working Group",
          reviewDate: new Date("2026-04-10"),
        },
        {
          clrBand: "ABOVE_LIMIT",
          guidanceText:
            "Reported concentration exceeds regulatory limits. Avoid regular consumption, consider safer alternatives in the category, and consult a healthcare professional if concerned.",
          sourceCitation: "PSQCA & WHO Health Advisory",
          reviewer: "SafeBite Nutrition Working Group",
          reviewDate: new Date("2026-04-10"),
        },
      ],
    });
  }

  console.log("🎉 SafeBite Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
