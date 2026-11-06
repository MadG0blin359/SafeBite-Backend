import { PrismaClient, ContaminantType, EvidenceLevel, StandardAuthority, ReferenceRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SafeBite Database Seeding (Phase 2)...");

  // 1. Seed 20 Pakistani Food Categories
  console.log("1. Seeding 20 Food Categories...");
  const categoryNames = [
    "Packaged Liquid Milk",
    "Bottled Natural Mineral Water",
    "Carbonated Beverages & Juices",
    "Instant Noodles",
    "Chocolates & Confectionery",
    "Commercial Bread & Bakery",
    "Packaged Tea & Coffee",
    "Processed Fruit & Sauces",
    "Spices & Condiments",
    "Edible Oils & Ghee",
    "Infant Formula & Baby Foods",
    "Biscuits & Cookies",
    "Snack Foods & Chips",
    "Rice & Basmati Grains",
    "Wheat Flour & Atta",
    "Pulses & Lentils",
    "Dairy - Yogurt & Butter",
    "Canned Vegetables & Pickles",
    "Poultry & Meat Products",
    "Honey & Sweeteners",
  ];

  const categoryMap = new Map<string, string>();
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, description: `Pakistani packaged category: ${name}` },
    });
    categoryMap.set(name, cat.id);
  }

  // 2. Seed Regulatory Standards Matrix (PSQCA, Codex, EU)
  console.log("2. Seeding Regulatory Reference Standards Matrix...");

  const standardsData = [
    // PSQCA PS: 5344-2022 for Packaged Liquid Milk
    {
      authority: StandardAuthority.PSQCA,
      standardCode: "PS: 5344-2022",
      version: "2022",
      contaminant: ContaminantType.LEAD,
      categoryName: "Packaged Liquid Milk",
      productMatrix: "Packaged liquid milk",
      limitValue: 0.02,
      unit: "mg/kg",
      basis: "wet_mass",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://psqca.com.pk/standards/PS-5344-2022",
    },
    {
      authority: StandardAuthority.PSQCA,
      standardCode: "PS: 5344-2022",
      version: "2022",
      contaminant: ContaminantType.CADMIUM,
      categoryName: "Packaged Liquid Milk",
      productMatrix: "Packaged liquid milk",
      limitValue: 0.01,
      unit: "mg/kg",
      basis: "wet_mass",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://psqca.com.pk/standards/PS-5344-2022",
    },
    {
      authority: StandardAuthority.PSQCA,
      standardCode: "PS: 5344-2022",
      version: "2022",
      contaminant: ContaminantType.CHROMIUM,
      categoryName: "Packaged Liquid Milk",
      productMatrix: "Packaged liquid milk",
      limitValue: 0.05,
      unit: "mg/kg",
      basis: "wet_mass",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://psqca.com.pk/standards/PS-5344-2022",
    },
    {
      authority: StandardAuthority.PSQCA,
      standardCode: "PS: 5344-2022",
      version: "2022",
      contaminant: ContaminantType.COPPER,
      categoryName: "Packaged Liquid Milk",
      productMatrix: "Packaged liquid milk",
      limitValue: 0.4,
      unit: "mg/kg",
      basis: "wet_mass",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://psqca.com.pk/standards/PS-5344-2022",
    },

    // PSQCA PS: 2102-2010 for Bottled Natural Mineral Waters
    {
      authority: StandardAuthority.PSQCA,
      standardCode: "PS: 2102-2010",
      version: "2010",
      contaminant: ContaminantType.LEAD,
      categoryName: "Bottled Natural Mineral Water",
      productMatrix: "Bottled natural mineral water",
      limitValue: 0.01,
      unit: "mg/l",
      basis: "volume",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://psqca.com.pk/standards/PS-2102-2010",
    },
    {
      authority: StandardAuthority.PSQCA,
      standardCode: "PS: 2102-2010",
      version: "2010",
      contaminant: ContaminantType.CADMIUM,
      categoryName: "Bottled Natural Mineral Water",
      productMatrix: "Bottled natural mineral water",
      limitValue: 0.003,
      unit: "mg/l",
      basis: "volume",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://psqca.com.pk/standards/PS-2102-2010",
    },
    {
      authority: StandardAuthority.PSQCA,
      standardCode: "PS: 2102-2010",
      version: "2010",
      contaminant: ContaminantType.CHROMIUM,
      categoryName: "Bottled Natural Mineral Water",
      productMatrix: "Bottled natural mineral water",
      limitValue: 0.05,
      unit: "mg/l",
      basis: "volume",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://psqca.com.pk/standards/PS-2102-2010",
    },

    // Codex CXS 193-1995 for Noodles / Cereals
    {
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.LEAD,
      categoryName: "Instant Noodles",
      productMatrix: "Instant noodles",
      limitValue: 0.2,
      unit: "mg/kg",
      basis: "dry_mass",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },
    {
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.CADMIUM,
      categoryName: "Instant Noodles",
      productMatrix: "Instant noodles",
      limitValue: 0.1,
      unit: "mg/kg",
      basis: "dry_mass",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },

    // Codex CXS 193-1995 for Chocolates
    {
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.CADMIUM,
      categoryName: "Chocolates & Confectionery",
      productMatrix: "Milk chocolate",
      limitValue: 0.3,
      unit: "mg/kg",
      basis: "mass",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },
    {
      authority: StandardAuthority.CODEX,
      standardCode: "CXS 193-1995",
      version: "2025",
      contaminant: ContaminantType.LEAD,
      categoryName: "Chocolates & Confectionery",
      productMatrix: "Milk chocolate",
      limitValue: 0.3,
      unit: "mg/kg",
      basis: "mass",
      referenceRole: ReferenceRole.PRIMARY_NATIONAL,
      sourceUrl: "https://www.fao.org/fao-who-codexalimentarius/codex-texts/standards/en/",
    },

    // European Union (EU 2023/915) Secondary References
    {
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

  for (const std of standardsData) {
    const categoryId = categoryMap.get(std.categoryName);
    if (!categoryId) continue;

    await prisma.referenceStandard.upsert({
      where: {
        authority_standardCode_contaminant_categoryId_productMatrix: {
          authority: std.authority,
          standardCode: std.standardCode,
          contaminant: std.contaminant,
          categoryId,
          productMatrix: std.productMatrix,
        },
      },
      update: { limitValue: std.limitValue, unit: std.unit, basis: std.basis },
      create: {
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
      },
    });
  }

  // 3. Seed Research Sources
  console.log("3. Seeding Published Research Literature Sources...");
  const source1 = await prisma.researchSource.create({
    data: {
      title: "Health Risk Assessment of Heavy Metals in Raw and Packed Milk from Rawalpindi and Islamabad",
      authors: "H. Anwar, S. Iqbal, A. Sajjad, H. Ullah, A. Farooqi, and B. Asif",
      publicationYear: 2022,
      journal: "Pak-Euro Journal of Medical and Life Sciences",
      location: "Rawalpindi & Islamabad",
      sampleSize: 45,
      methodology: "AAS (Atomic Absorption Spectroscopy)",
      doi: "10.31580/pjmls.v5i2.2580",
      url: "https://doi.org/10.31580/pjmls.v5i2.2580",
    },
  });

  const source2 = await prisma.researchSource.create({
    data: {
      title: "Analysis and Human Health Risk from Selected Heavy Metals in Common Instant Noodles",
      authors: "M. Idrees",
      publicationYear: 2020,
      journal: "Biological Trace Element Research",
      location: "Lahore",
      sampleSize: 30,
      methodology: "ICP-OES",
      doi: "10.1007/s12011-020-02062-6",
      url: "https://doi.org/10.1007/s12011-020-02062-6",
    },
  });

  const source3 = await prisma.researchSource.create({
    data: {
      title: "Determination of Heavy Metals in Locally Available Chocolates in Lahore Region",
      authors: "M. Amjad, S. Hussain, Z. U. R. Baloch, and A. Raza",
      publicationYear: 2021,
      journal: "Turkish Journal of Agriculture-Food Science and Technology",
      location: "Lahore",
      sampleSize: 25,
      methodology: "Flame-AAS",
      doi: "10.24925/turjaf.v9i6.1144-1153.4262",
      url: "https://doi.org/10.24925/turjaf.v9i6.1144-1153.4262",
    },
  });

  // 4. Seed Products & Associated Research Data
  console.log("4. Seeding Sample Products & Research Measurements...");

  // Product 1: Nestle MilkPak (Packaged Liquid Milk)
  const milkCatId = categoryMap.get("Packaged Liquid Milk")!;
  const milkpak = await prisma.product.upsert({
    where: { barcode: "8964000100014" },
    update: {},
    create: {
      barcode: "8964000100014",
      name: "MilkPak UHT Liquid Milk 1000ml",
      brand: "Nestle",
      categoryId: milkCatId,
      packageSize: "1000ml",
      matrix: "Packaged liquid milk",
    },
  });

  // Measurements for MilkPak (Study 1)
  await prisma.researchData.createMany({
    data: [
      {
        productId: milkpak.id,
        brand: "Nestle",
        categoryId: milkCatId,
        contaminant: ContaminantType.LEAD,
        concentration: 0.008, // Below 0.02 limit -> CLR = 0.40
        unit: "mg/kg",
        basis: "wet_mass",
        evidenceLevel: EvidenceLevel.PRODUCT_SPECIFIC,
        measurementStatus: "MEASURED",
        sourceId: source1.id,
      },
      {
        productId: milkpak.id,
        brand: "Nestle",
        categoryId: milkCatId,
        contaminant: ContaminantType.CADMIUM,
        concentration: 0.002, // Below 0.01 limit -> CLR = 0.20
        unit: "mg/kg",
        basis: "wet_mass",
        evidenceLevel: EvidenceLevel.PRODUCT_SPECIFIC,
        measurementStatus: "MEASURED",
        sourceId: source1.id,
      },
      {
        productId: milkpak.id,
        brand: "Nestle",
        categoryId: milkCatId,
        contaminant: ContaminantType.CHROMIUM,
        concentration: 0.015, // Below 0.05 limit -> CLR = 0.30
        unit: "mg/kg",
        basis: "wet_mass",
        evidenceLevel: EvidenceLevel.PRODUCT_SPECIFIC,
        measurementStatus: "MEASURED",
        sourceId: source1.id,
      },
    ],
  });

  // Product 2: Olper's Milk (Packaged Liquid Milk)
  const olpers = await prisma.product.upsert({
    where: { barcode: "8964000200028" },
    update: {},
    create: {
      barcode: "8964000200028",
      name: "Olper's Full Cream UHT Milk 1000ml",
      brand: "Engro",
      categoryId: milkCatId,
      packageSize: "1000ml",
      matrix: "Packaged liquid milk",
    },
  });

  await prisma.researchData.createMany({
    data: [
      {
        productId: olpers.id,
        brand: "Engro",
        categoryId: milkCatId,
        contaminant: ContaminantType.LEAD,
        concentration: 0.011, // CLR = 0.55
        unit: "mg/kg",
        basis: "wet_mass",
        evidenceLevel: EvidenceLevel.PRODUCT_SPECIFIC,
        measurementStatus: "MEASURED",
        sourceId: source1.id,
      },
      {
        productId: olpers.id,
        brand: "Engro",
        categoryId: milkCatId,
        contaminant: ContaminantType.CADMIUM,
        concentration: 0.003, // CLR = 0.30
        unit: "mg/kg",
        basis: "wet_mass",
        evidenceLevel: EvidenceLevel.PRODUCT_SPECIFIC,
        measurementStatus: "MEASURED",
        sourceId: source1.id,
      },
    ],
  });

  // Product 3: Knorr Chattpatta Noodles (Instant Noodles)
  const noodleCatId = categoryMap.get("Instant Noodles")!;
  const knorrNoodles = await prisma.product.upsert({
    where: { barcode: "8964000300032" },
    update: {},
    create: {
      barcode: "8964000300032",
      name: "Knorr Chattpatta Instant Noodles 66g",
      brand: "Knorr",
      categoryId: noodleCatId,
      packageSize: "66g",
      matrix: "Instant noodles",
    },
  });

  await prisma.researchData.createMany({
    data: [
      {
        productId: knorrNoodles.id,
        brand: "Knorr",
        categoryId: noodleCatId,
        contaminant: ContaminantType.LEAD,
        concentration: 0.09, // Limit is 0.2 -> CLR = 0.45
        unit: "mg/kg",
        basis: "dry_mass",
        evidenceLevel: EvidenceLevel.PRODUCT_SPECIFIC,
        measurementStatus: "MEASURED",
        sourceId: source2.id,
      },
      {
        productId: knorrNoodles.id,
        brand: "Knorr",
        categoryId: noodleCatId,
        contaminant: ContaminantType.CADMIUM,
        concentration: 0.04, // Limit is 0.1 -> CLR = 0.40
        unit: "mg/kg",
        basis: "dry_mass",
        evidenceLevel: EvidenceLevel.PRODUCT_SPECIFIC,
        measurementStatus: "MEASURED",
        sourceId: source2.id,
      },
    ],
  });

  // 5. Seed Health-Context Evidence (FR-16)
  console.log("5. Seeding Health-Context Evidence Records...");
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

  // 6. Seed Exposure-Reduction Guidance (FR-17)
  console.log("6. Seeding Exposure-Reduction Guidance Records...");
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
