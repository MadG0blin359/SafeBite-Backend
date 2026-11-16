import { prisma } from "../config/prisma.js";
import {
  ACTIVE_RULE_VERSION,
  StatusCatalogue,
  ReasonCodes,
  CONTAMINANT_REGISTRY,
  ContaminantRegistryType,
} from "../constants/status.constants.js";
import { standardResolverService } from "./standard-resolver.service.js";
import { clrService, ClrCalculationResult, ContaminantMeasurementInput } from "./clr.service.js";
import { scoringService, ProductSafetyScoreResult } from "./scoring.service.js";
import { interpretationService, PlainLanguageInterpretation } from "./interpretation.service.js";
import { ContaminantType } from "@prisma/client";

export interface CompleteSafetyAnalysisResponse {
  product: {
    id: string;
    barcode: string | null;
    name: string;
    brand: string;
    category: string;
    imageUrl: string | null;
  };
  score: ProductSafetyScoreResult;
  interpretation: PlainLanguageInterpretation;
}

export const safetyEngineService = {
  /**
   * Performs full deterministic safety analysis for a product ID.
   * Resolves standards, calculates CLRs, computes CCI, determines Grade,
   * generates plain interpretation, and updates AnalysisResult record.
   */
  async analyzeProduct(productId: string): Promise<CompleteSafetyAnalysisResponse | null> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        researchData: {
          include: { source: true },
        },
      },
    });

    if (!product) {
      return null;
    }

    // Resolve standards for all 5 contaminants for this category & matrix
    const resolvedStandards = await standardResolverService.resolveAllForCategory(
      product.categoryId,
      product.matrix,
      product.name
    );

    // Group research data by contaminant
    const clrResults: ClrCalculationResult[] = [];

    for (const contaminant of CONTAMINANT_REGISTRY) {
      const contaminantEnum = contaminant as unknown as ContaminantType;
      const measurements = product.researchData.filter((r) => r.contaminant === contaminantEnum);

      // Hierarchical evidence retrieval: Product-Specific > Brand-Level > Category-Level (FR-03-07)
      let selectedMeasurement = measurements.find((m) => m.evidenceLevel === "PRODUCT_SPECIFIC");
      if (!selectedMeasurement) {
        selectedMeasurement = measurements.find((m) => m.evidenceLevel === "BRAND_LEVEL");
      }
      if (!selectedMeasurement) {
        selectedMeasurement = measurements.find((m) => m.evidenceLevel === "CATEGORY_LEVEL");
      }

      let measurementInput: ContaminantMeasurementInput | null = null;
      if (selectedMeasurement) {
        measurementInput = {
          contaminant,
          concentration: selectedMeasurement.concentration,
          unit: selectedMeasurement.unit,
          basis: selectedMeasurement.basis,
          evidenceLevel: selectedMeasurement.evidenceLevel,
          measurementStatus: selectedMeasurement.measurementStatus,
          sourceInfo: selectedMeasurement.source
            ? {
                title: selectedMeasurement.source.title,
                doi: selectedMeasurement.source.doi,
                url: selectedMeasurement.source.url,
                authors: selectedMeasurement.source.authors,
                year: selectedMeasurement.source.publicationYear,
                journal: selectedMeasurement.source.journal,
              }
            : null,
        };
      }

      const standards = resolvedStandards[contaminantEnum];
      const clrRes = clrService.calculateClr(
        contaminant,
        measurementInput,
        standards?.primaryReference || null,
        standards?.secondaryReference || null
      );

      clrResults.push(clrRes);
    }

    // Compute CCI, Max CLR, and A-F Grade
    const scoreResult = scoringService.calculateProductSafetyScore(clrResults);

    // Generate plain language interpretation (FR-07)
    const interpretation = interpretationService.generateInterpretation(product.name, scoreResult);

    // Persist or update the AnalysisResult in PostgreSQL for caching & recommendations atomically
    try {
      const analysisData = {
        ruleVersion: ACTIVE_RULE_VERSION,
        clrBreakdown: clrResults as any,
        maxClr: scoreResult.maxClr,
        highestContaminant: scoreResult.highestContaminant as ContaminantType | null,
        cci: scoreResult.cci,
        grade: scoreResult.grade,
        gradeEligible: scoreResult.isGradeEligible,
        statusText: scoreResult.overallStatusText,
        reasonCode: scoreResult.overallReasonCode,
        eligibleCount: scoreResult.eligibleCount,
        testedCount: scoreResult.testedCount,
        excludedReasons: scoreResult.excludedReasons as any,
        calculatedAt: new Date(),
      };

      await prisma.analysisResult.upsert({
        where: {
          productId_ruleVersion: {
            productId: product.id,
            ruleVersion: ACTIVE_RULE_VERSION,
          },
        },
        update: analysisData,
        create: {
          productId: product.id,
          ...analysisData,
        },
      });
    } catch (err) {
      console.error("Warning: Failed to cache analysis result to DB:", err);
    }

    return {
      product: {
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        category: product.category.name,
        imageUrl: product.imageUrl,
      },
      score: scoreResult,
      interpretation,
    };
  },
};

export default safetyEngineService;
