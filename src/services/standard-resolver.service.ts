import { prisma } from "../config/prisma.js";
import { ContaminantType, ReferenceRole, ReferenceStandard, StandardAuthority } from "@prisma/client";

export interface ResolvedStandards {
  primaryReference: ReferenceStandard | null; // PSQCA primary national, or Codex / PS CXS 193 fallback
  secondaryReference: ReferenceStandard | null; // EU comparison
}

// Lightweight in-memory cache for category standards with 5-minute TTL to accelerate bulk lookups
const categoryStandardsCache = new Map<
  string,
  { timestamp: number; standards: ReferenceStandard[] }
>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getCategoryStandards(categoryId: string): Promise<ReferenceStandard[]> {
  const cached = categoryStandardsCache.get(categoryId);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.standards;
  }

  const standards = await prisma.referenceStandard.findMany({
    where: { categoryId },
    orderBy: [{ version: "desc" }, { standardCode: "asc" }],
  });

  categoryStandardsCache.set(categoryId, { timestamp: now, standards });
  return standards;
}

/**
 * Deterministically matches the best applicable reference standard in-memory.
 */
function matchStandardInMemory(
  standards: ReferenceStandard[],
  contaminant: ContaminantType,
  roles: ReferenceRole[],
  authorities?: StandardAuthority[],
  productMatrix?: string | null,
  productName?: string | null
): ReferenceStandard | null {
  const candidatePool = standards.filter((s) => {
    if (s.contaminant !== contaminant) return false;
    if (!roles.includes(s.referenceRole)) return false;
    if (authorities && !authorities.includes(s.authority)) return false;
    return true;
  });

  if (candidatePool.length === 0) {
    return null;
  }

  // 1. Exact productMatrix match
  if (productMatrix) {
    const cleanMatrix = productMatrix.toLowerCase().trim();
    const exact = candidatePool.find(
      (s) => s.productMatrix && s.productMatrix.toLowerCase().trim() === cleanMatrix
    );
    if (exact) return exact;

    // 2. Partial productMatrix match
    const partial = candidatePool.find(
      (s) => s.productMatrix && s.productMatrix.toLowerCase().includes(cleanMatrix)
    );
    if (partial) return partial;
  }

  // 3. Keyword match against product name
  if (productName) {
    const cleanName = productName.toLowerCase();
    for (const std of candidatePool) {
      if (!std.productMatrix) continue;
      const stdMatrix = std.productMatrix.toLowerCase();
      const keywords = stdMatrix.split(/[\s,()/-]+/).filter((w) => w.length > 2);
      if (keywords.some((k) => cleanName.includes(k))) {
        return std;
      }
    }
  }

  // 4. Category-wide limit (productMatrix is null)
  const categoryWide = candidatePool.find((s) => s.productMatrix === null);
  if (categoryWide) {
    return categoryWide;
  }

  // 5. Deterministic fallback to first available standard in candidate pool
  return candidatePool[0] || null;
}

export const standardResolverService = {
  /**
   * Clears the standard resolution cache (useful after seeding or migrations).
   */
  clearCache(): void {
    categoryStandardsCache.clear();
  },

  /**
   * Resolves the applicable reference standard for a contaminant and product category/matrix.
   * Hierarchy (FR-04-01 & FR-04-02):
   * 1. Domestic PSQCA standard (PRIMARY_NATIONAL)
   * 2. International Fallback (PS CXS 193 / CODEX INTERNATIONAL_FALLBACK)
   * Secondary comparison: European Union (EU)
   */
  async resolveForContaminant(
    contaminant: ContaminantType,
    categoryId: string,
    productMatrix?: string | null,
    productName?: string | null
  ): Promise<ResolvedStandards> {
    const standards = await getCategoryStandards(categoryId);

    let primaryReference = matchStandardInMemory(
      standards,
      contaminant,
      [ReferenceRole.PRIMARY_NATIONAL],
      [StandardAuthority.PSQCA],
      productMatrix,
      productName
    );

    if (!primaryReference) {
      primaryReference = matchStandardInMemory(
        standards,
        contaminant,
        [ReferenceRole.INTERNATIONAL_FALLBACK],
        [StandardAuthority.PSQCA, StandardAuthority.CODEX],
        productMatrix,
        productName
      );
    }

    if (!primaryReference) {
      primaryReference = matchStandardInMemory(
        standards,
        contaminant,
        [ReferenceRole.INTERNATIONAL_FALLBACK],
        [StandardAuthority.EU],
        productMatrix,
        productName
      );
    }

    const secondaryReference = matchStandardInMemory(
      standards,
      contaminant,
      [ReferenceRole.SECONDARY_COMPARISON],
      [StandardAuthority.EU],
      productMatrix,
      productName
    );

    return {
      primaryReference,
      secondaryReference,
    };
  },

  /**
   * Resolves standards for all 5 contaminants for a category in a single optimized pass.
   */
  async resolveAllForCategory(
    categoryId: string,
    productMatrix?: string | null,
    productName?: string | null
  ): Promise<Record<ContaminantType, ResolvedStandards>> {
    const standards = await getCategoryStandards(categoryId);

    const contaminants: ContaminantType[] = [
      ContaminantType.LEAD,
      ContaminantType.CADMIUM,
      ContaminantType.CHROMIUM,
      ContaminantType.COBALT,
      ContaminantType.COPPER,
    ];

    const results: Partial<Record<ContaminantType, ResolvedStandards>> = {};

    for (const c of contaminants) {
      let primaryReference = matchStandardInMemory(
        standards,
        c,
        [ReferenceRole.PRIMARY_NATIONAL],
        [StandardAuthority.PSQCA],
        productMatrix,
        productName
      );

      if (!primaryReference) {
        primaryReference = matchStandardInMemory(
          standards,
          c,
          [ReferenceRole.INTERNATIONAL_FALLBACK],
          [StandardAuthority.PSQCA, StandardAuthority.CODEX],
          productMatrix,
          productName
        );
      }

      if (!primaryReference) {
        primaryReference = matchStandardInMemory(
          standards,
          c,
          [ReferenceRole.INTERNATIONAL_FALLBACK],
          [StandardAuthority.EU],
          productMatrix,
          productName
        );
      }

      const secondaryReference = matchStandardInMemory(
        standards,
        c,
        [ReferenceRole.SECONDARY_COMPARISON],
        [StandardAuthority.EU],
        productMatrix,
        productName
      );

      results[c] = {
        primaryReference,
        secondaryReference,
      };
    }

    return results as Record<ContaminantType, ResolvedStandards>;
  },
};

export default standardResolverService;
