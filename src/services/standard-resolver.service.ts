import { prisma } from "../config/prisma.js";
import { ContaminantType, StandardAuthority } from "@prisma/client";

export interface ResolvedStandards {
  primaryReference: any | null; // PSQCA (or Codex fallback)
  secondaryReference: any | null; // EU comparison
}

export const standardResolverService = {
  /**
   * Resolves the applicable reference standard for a contaminant and product category/matrix.
   * Hierarchy (FR-04-01 & FR-04-02):
   * 1. PSQCA (Primary National Reference for Pakistan)
   * 2. Codex Alimentarius (International Fallback)
   * Secondary comparison: European Union (EU)
   */
  async resolveForContaminant(
    contaminant: ContaminantType,
    categoryId: string,
    productMatrix?: string | null
  ): Promise<ResolvedStandards> {
    // 1. Attempt to find PSQCA limit
    let psqcaLimit = await prisma.referenceStandard.findFirst({
      where: {
        authority: StandardAuthority.PSQCA,
        contaminant,
        categoryId,
        ...(productMatrix ? { productMatrix: { equals: productMatrix, mode: "insensitive" } } : {}),
      },
    });

    // If matrix specific not found, try category-wide PSQCA limit
    if (!psqcaLimit && productMatrix) {
      psqcaLimit = await prisma.referenceStandard.findFirst({
        where: {
          authority: StandardAuthority.PSQCA,
          contaminant,
          categoryId,
          productMatrix: null,
        },
      });
    }

    // 2. If no PSQCA, fallback to Codex Alimentarius
    let codexLimit = null;
    if (!psqcaLimit) {
      codexLimit = await prisma.referenceStandard.findFirst({
        where: {
          authority: StandardAuthority.CODEX,
          contaminant,
          categoryId,
          ...(productMatrix ? { productMatrix: { equals: productMatrix, mode: "insensitive" } } : {}),
        },
      });

      if (!codexLimit && productMatrix) {
        codexLimit = await prisma.referenceStandard.findFirst({
          where: {
            authority: StandardAuthority.CODEX,
            contaminant,
            categoryId,
            productMatrix: null,
          },
        });
      }
    }

    // Primary reference is PSQCA if available, otherwise Codex
    const primaryReference = psqcaLimit || codexLimit;

    // 3. Resolve secondary EU reference for informative display
    let euLimit = await prisma.referenceStandard.findFirst({
      where: {
        authority: StandardAuthority.EU,
        contaminant,
        categoryId,
        ...(productMatrix ? { productMatrix: { equals: productMatrix, mode: "insensitive" } } : {}),
      },
    });

    if (!euLimit && productMatrix) {
      euLimit = await prisma.referenceStandard.findFirst({
        where: {
          authority: StandardAuthority.EU,
          contaminant,
          categoryId,
          productMatrix: null,
        },
      });
    }

    return {
      primaryReference,
      secondaryReference: euLimit,
    };
  },

  /**
   * Resolves standards for all 5 contaminants for a category.
   */
  async resolveAllForCategory(
    categoryId: string,
    productMatrix?: string | null
  ): Promise<Record<ContaminantType, ResolvedStandards>> {
    const contaminants: ContaminantType[] = [
      ContaminantType.LEAD,
      ContaminantType.CADMIUM,
      ContaminantType.CHROMIUM,
      ContaminantType.COBALT,
      ContaminantType.COPPER,
    ];

    const results: Partial<Record<ContaminantType, ResolvedStandards>> = {};

    for (const c of contaminants) {
      results[c] = await this.resolveForContaminant(c, categoryId, productMatrix);
    }

    return results as Record<ContaminantType, ResolvedStandards>;
  },
};

export default standardResolverService;
