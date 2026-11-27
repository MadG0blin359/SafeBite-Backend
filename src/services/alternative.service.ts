import { prisma } from "../config/prisma.js";
import {
  ACTIVE_RULE_VERSION,
  StatusCatalogue,
  ReasonCodes,
} from "../constants/status.constants.js";

export const AlternativeStatus = {
  AVAILABLE: "Available",
  INSUFFICIENT_DATA: StatusCatalogue.ST_08_INSUFFICIENT_DATA,
  PRODUCT_NOT_FOUND: StatusCatalogue.ST_09_PRODUCT_NOT_FOUND,
} as const;

export interface AlternativeRecommendation {
  productId: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  grade: string | null;
  cci: number | null;
  maxClr: number | null;
  comparisonNote: string;
}

export interface AlternativesResponse {
  sourceProductId: string;
  categoryName: string;
  status: string;
  reasonCode: string | null;
  alternatives: AlternativeRecommendation[];
}

export const alternativeService = {
  /**
   * Recommends safer product alternatives in the same category (FR-08).
   * Strict adherence to GR-03 & FR-08-04: Only products with product-specific
   * analysis under the active rule version are compared.
   */
  async getSaferAlternatives(productId: string): Promise<AlternativesResponse> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        analysisResults: {
          where: { ruleVersion: ACTIVE_RULE_VERSION },
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!product) {
      return {
        sourceProductId: productId,
        categoryName: "Unknown",
        status: StatusCatalogue.ST_09_PRODUCT_NOT_FOUND,
        reasonCode: null,
        alternatives: [],
      };
    }

    const currentAnalysis = product.analysisResults[0];

    // Query other consumer-facing products in the same category that have valid analysis results under active rule version
    const candidateProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: productId },
        isConsumerFacing: true,
        analysisResults: {
          some: {
            ruleVersion: ACTIVE_RULE_VERSION,
            gradeEligible: true,
            OR: [
              { cci: { not: null } },
              { grade: { not: null } },
            ],
          },
        },
      },
      include: {
        analysisResults: {
          where: { ruleVersion: ACTIVE_RULE_VERSION, gradeEligible: true },
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!candidateProducts || candidateProducts.length === 0) {
      return {
        sourceProductId: productId,
        categoryName: product.category.name,
        status: AlternativeStatus.INSUFFICIENT_DATA,
        reasonCode: ReasonCodes.NO_COMPARABLE_RESULTS,
        alternatives: [],
      };
    }

    const gradeRank: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, F: 5 };

    // Rank candidates by grade (A -> D), lowest CCI, then lowest maxClr
    const ranked = candidateProducts
      .map((p) => {
        const ar = p.analysisResults[0];
        return {
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          imageUrl: p.imageUrl,
          grade: ar.grade,
          cci: ar.cci,
          maxClr: ar.maxClr,
          calculatedAt: ar.calculatedAt,
        };
      })
      .sort((a, b) => {
        const aGrade = a.grade ? (gradeRank[a.grade] ?? 99) : 99;
        const bGrade = b.grade ? (gradeRank[b.grade] ?? 99) : 99;
        if (aGrade !== bGrade) {
          return aGrade - bGrade;
        }
        if ((a.cci ?? 999) !== (b.cci ?? 999)) {
          return (a.cci ?? 999) - (b.cci ?? 999);
        }
        return (a.maxClr ?? 999) - (b.maxClr ?? 999);
      });

    // Filter to those that are safer than the current product
    const currentCci = currentAnalysis?.cci ?? null;
    const currentGrade = currentAnalysis?.grade ?? null;
    const currentGradeRank = currentGrade ? (gradeRank[currentGrade] ?? 99) : 99;

    const saferCandidates = ranked.filter((cand) => {
      const candGradeRank = cand.grade ? (gradeRank[cand.grade] ?? 99) : 99;
      // Do not recommend Grade F products as a safer alternative unless current is also F and cand has strictly lower contamination
      if (currentGradeRank < 5 && candGradeRank >= 5) {
        return false;
      }
      if (currentCci !== null && cand.cci !== null) {
        return cand.cci < currentCci;
      }
      if (currentGradeRank !== 99 && candGradeRank < currentGradeRank) {
        return true;
      }
      return candGradeRank < 5;
    });

    const alternatives: AlternativeRecommendation[] = saferCandidates.slice(0, 5).map((cand) => {
      let comparisonNote = `Reported lower contamination (CCI: ${cand.cci ?? "N/A"})`;
      if (currentCci !== null && cand.cci !== null && currentCci > 0) {
        const diff = ((currentCci - cand.cci) / currentCci * 100).toFixed(0);
        comparisonNote = `Shows ~${diff}% lower Cumulative Contamination Index than scanned item.`;
      } else if (cand.grade && currentGrade && cand.grade !== currentGrade) {
        comparisonNote = `Awarded Safety Grade ${cand.grade} compared to scanned product Grade ${currentGrade}.`;
      }

      return {
        productId: cand.productId,
        productName: cand.productName,
        brand: cand.brand,
        imageUrl: cand.imageUrl,
        grade: cand.grade,
        cci: cand.cci,
        maxClr: cand.maxClr,
        comparisonNote,
      };
    });

    if (alternatives.length === 0) {
      return {
        sourceProductId: productId,
        categoryName: product.category.name,
        status: AlternativeStatus.INSUFFICIENT_DATA,
        reasonCode: ReasonCodes.NO_COMPARABLE_RESULTS,
        alternatives: [],
      };
    }

    return {
      sourceProductId: productId,
      categoryName: product.category.name,
      status: AlternativeStatus.AVAILABLE,
      reasonCode: null,
      alternatives,
    };
  },
};

export default alternativeService;
