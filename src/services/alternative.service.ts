import { prisma } from "../config/prisma.js";
import {
  ACTIVE_RULE_VERSION,
  StatusCatalogue,
  ReasonCodes,
} from "../constants/status.constants.js";

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

    // Query other products in the same category that have valid analysis results under active rule version
    const candidateProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: productId },
        analysisResults: {
          some: {
            ruleVersion: ACTIVE_RULE_VERSION,
            gradeEligible: true,
            cci: { not: null },
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
        status: StatusCatalogue.ST_08_INSUFFICIENT_DATA,
        reasonCode: ReasonCodes.NO_COMPARABLE_RESULTS,
        alternatives: [],
      };
    }

    // Rank candidates by lowest CCI, then lowest maxClr
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
        if ((a.cci ?? 999) !== (b.cci ?? 999)) {
          return (a.cci ?? 999) - (b.cci ?? 999);
        }
        return (a.maxClr ?? 999) - (b.maxClr ?? 999);
      });

    // Filter to those that have lower or equal CCI compared to current product (if current has CCI)
    const currentCci = currentAnalysis?.cci ?? null;
    const saferCandidates = currentCci !== null
      ? ranked.filter((r) => r.cci !== null && r.cci < currentCci)
      : ranked;

    const alternatives: AlternativeRecommendation[] = saferCandidates.slice(0, 5).map((cand) => {
      let comparisonNote = `Reported lower contamination (CCI: ${cand.cci})`;
      if (currentCci !== null && cand.cci !== null) {
        const diff = ((currentCci - cand.cci) / currentCci * 100).toFixed(0);
        comparisonNote = `Shows ~${diff}% lower Cumulative Contamination Index than scanned item.`;
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
        status: StatusCatalogue.ST_08_INSUFFICIENT_DATA,
        reasonCode: ReasonCodes.NO_COMPARABLE_RESULTS,
        alternatives: [],
      };
    }

    return {
      sourceProductId: productId,
      categoryName: product.category.name,
      status: "Success",
      reasonCode: null,
      alternatives,
    };
  },
};

export default alternativeService;
