import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { PrismaClient, StandardAuthority } from "@prisma/client";
import { z } from "zod";
import {
  SAFEBITE_CATEGORIES,
  ELEMENT_TO_CONTAMINANT,
  EXCLUDED_CATEGORY_PATTERNS,
  PSQCA_CATEGORY_MAP,
  parseStandardVersionAndRole,
  extractProductMatrix,
  deriveBasis,
} from "./mappings/psqca-standards.mapping.js";

const DEFAULT_EXCEL_PATH = path.resolve(
  process.cwd(),
  "prisma",
  "data",
  "standards",
  "PSQCA_Complete_Food_Standards_Repository.xlsx"
);

const rawStandardRowSchema = z.object({
  __EMPTY: z.string().regex(/^RL-\d{4}$/, "Invalid external record ID"),
  "Standard Number": z.string().trim().min(1),
  "Food / Product Category": z.string().trim().min(1),
  Contaminant: z.string().trim().min(1),
  Element: z.string().trim().min(1),
  "Limit Value": z.coerce.number().positive(),
  Unit: z.string().trim().min(1),
  "Limit Basis / Notes": z.string().nullable().optional(),
  "Limit Type": z.string().trim().min(1),
  "Document Source": z.string().url().nullable().optional(),
});

export interface StandardsSeedSummary {
  totalExcelRows: number;
  ingestedPsqcaRows: number;
  skippedNonCoreElementRows: number;
  skippedNonFoodOrGuidelineRows: number;
  unmappedCategoryNames: string[];
}

export async function ensureSafeBiteCategories(prisma: PrismaClient): Promise<Map<string, string>> {
  const categoryMap = new Map<string, string>();
  for (const name of SAFEBITE_CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `Pakistani packaged food category: ${name}`,
      },
    });
    categoryMap.set(name, cat.id);
  }
  return categoryMap;
}

export async function seedPsqcaStandards(
  prisma: PrismaClient,
  categoryMap?: Map<string, string>,
  excelPath = DEFAULT_EXCEL_PATH
): Promise<StandardsSeedSummary> {
  const resolvedCategories = categoryMap ?? (await ensureSafeBiteCategories(prisma));

  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets["Regulatory_Limit"];
  if (!sheet) {
    throw new Error(`Worksheet 'Regulatory_Limit' not found in ${excelPath}`);
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  let ingestedPsqcaRows = 0;
  let skippedNonCoreElementRows = 0;
  let skippedNonFoodOrGuidelineRows = 0;
  const unmappedCategoryNames = new Set<string>();

  const operations = [];

  for (const rawRow of rawRows) {
    const parsed = rawStandardRowSchema.parse(rawRow);
    const contaminant = ELEMENT_TO_CONTAMINANT[parsed.Element];

    if (!contaminant) {
      skippedNonCoreElementRows++;
      continue;
    }

    const foodCategory = parsed["Food / Product Category"];
    const isExcludedCategory = EXCLUDED_CATEGORY_PATTERNS.some((pattern) => pattern.test(foodCategory));

    if (isExcludedCategory || parsed["Limit Type"] !== "Maximum / permissible limit") {
      skippedNonFoodOrGuidelineRows++;
      continue;
    }

    const safeBiteCategoryName = PSQCA_CATEGORY_MAP[foodCategory];
    if (!safeBiteCategoryName) {
      unmappedCategoryNames.add(foodCategory);
      continue;
    }

    const categoryId = resolvedCategories.get(safeBiteCategoryName);
    if (!categoryId) {
      throw new Error(`Missing category ID for mapped SafeBite category '${safeBiteCategoryName}'`);
    }

    const externalRecordId = parsed.__EMPTY;
    const standardCode = parsed["Standard Number"];
    const { version, referenceRole } = parseStandardVersionAndRole(standardCode);
    const productMatrix = extractProductMatrix(foodCategory, parsed.Contaminant);
    const notes = parsed["Limit Basis / Notes"]?.trim() || null;
    const basis = deriveBasis(parsed.Unit, notes);

    const payload = {
      externalRecordId,
      authority: StandardAuthority.PSQCA,
      standardCode,
      version,
      contaminant,
      categoryId,
      productMatrix,
      limitValue: parsed["Limit Value"],
      unit: parsed.Unit,
      basis,
      referenceRole,
      notes,
      sourceUrl: parsed["Document Source"] || null,
    };

    operations.push(
      prisma.referenceStandard.upsert({
        where: { externalRecordId },
        update: payload,
        create: payload,
      })
    );
    ingestedPsqcaRows++;
  }

  if (unmappedCategoryNames.size > 0) {
    throw new Error(
      `Unmapped PSQCA food categories detected: ${Array.from(unmappedCategoryNames).join(", ")}`
    );
  }

  // Upsert in batches inside a transaction for consistency and speed
  const BATCH_SIZE = 50;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    await prisma.$transaction(operations.slice(i, i + BATCH_SIZE));
  }

  // Remove stale legacy unkeyed PSQCA mock standards if any existed from older seed versions
  await prisma.referenceStandard.deleteMany({
    where: {
      externalRecordId: null,
      authority: StandardAuthority.PSQCA,
    },
  });

  return {
    totalExcelRows: rawRows.length,
    ingestedPsqcaRows,
    skippedNonCoreElementRows,
    skippedNonFoodOrGuidelineRows,
    unmappedCategoryNames: [],
  };
}
