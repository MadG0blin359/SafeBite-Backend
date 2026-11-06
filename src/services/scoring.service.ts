import {
  ACTIVE_RULE_VERSION,
  StatusCatalogue,
  ReasonCodes,
  StatusCatalogueType,
  ReasonCodeType,
  ContaminantRegistryType,
} from "../constants/status.constants.js";
import { ClrCalculationResult } from "./clr.service.js";

export interface ProductSafetyScoreResult {
  ruleVersion: string;
  isGradeEligible: boolean;
  overallStatusText: StatusCatalogueType;
  overallReasonCode: ReasonCodeType | null;
  grade: "A" | "B" | "C" | "D" | "F" | null;
  cci: number | null;
  maxClr: number | null;
  highestContaminant: ContaminantRegistryType | null;
  testedCount: number;
  eligibleCount: number;
  missingCount: number;
  ineligibleCount: number;
  clrBreakdown: ClrCalculationResult[];
  includedContaminants: ContaminantRegistryType[];
  excludedReasons: Record<string, string>;
  calculatedAt: string;
}

export const scoringService = {
  /**
   * Computes the Cumulative Contamination Index (CCI) and
   * standardized A-F Decision-Support Grade from per-contaminant CLR results.
   * Implements Equations 3.3, FR-05, and FR-06.
   */
  calculateProductSafetyScore(clrResults: ClrCalculationResult[]): ProductSafetyScoreResult {
    let testedCount = 0;
    let missingCount = 0;
    let ineligibleCount = 0;

    const eligibleClrResults: ClrCalculationResult[] = [];
    const excludedReasons: Record<string, string> = {};

    for (const res of clrResults) {
      if (res.measuredConcentration !== null && res.measuredConcentration !== undefined) {
        testedCount++;
      } else {
        missingCount++;
        excludedReasons[res.contaminant] = ReasonCodes.NO_MEASUREMENT;
        continue;
      }

      // Check if product-specific
      if (res.evidenceLevel !== "PRODUCT_SPECIFIC") {
        ineligibleCount++;
        excludedReasons[res.contaminant] = ReasonCodes.NOT_PRODUCT_SPECIFIC;
        continue;
      }

      // Check if valid CLR was computed
      if (res.clr === null || res.clr === undefined) {
        ineligibleCount++;
        excludedReasons[res.contaminant] = res.reasonCode || ReasonCodes.NO_LIMIT;
        continue;
      }

      // If valid and product-specific, it contributes to CCI
      eligibleClrResults.push(res);
    }

    const eligibleCount = eligibleClrResults.length;
    const includedContaminants = eligibleClrResults.map((r) => r.contaminant);

    // Minimum eligibility check (FR-06-06 & ReasonCodes.MIN_ELIGIBLE_NOT_MET):
    // 1. Must have at least 2 eligible contaminants (k >= 2)
    // 2. Must contain at least one primary toxic metal (LEAD or CADMIUM)
    const hasPriorityMetal = includedContaminants.some((c) => c === "LEAD" || c === "CADMIUM");
    const isEligible = eligibleCount >= 2 && hasPriorityMetal;

    if (!isEligible) {
      const reason =
        eligibleCount === 0 && testedCount === 0
          ? ReasonCodes.NO_RESEARCH_RECORD
          : ReasonCodes.MIN_ELIGIBLE_NOT_MET;

      return {
        ruleVersion: ACTIVE_RULE_VERSION,
        isGradeEligible: false,
        overallStatusText: StatusCatalogue.ST_08_INSUFFICIENT_DATA,
        overallReasonCode: reason,
        grade: null,
        cci: null,
        maxClr: null,
        highestContaminant: null,
        testedCount,
        eligibleCount,
        missingCount,
        ineligibleCount,
        clrBreakdown: clrResults,
        includedContaminants: [],
        excludedReasons,
        calculatedAt: new Date().toISOString(),
      };
    }

    // Equation 3.3: CCI = (1 / k) * sum(CLR_i)
    const sumClr = eligibleClrResults.reduce((acc, curr) => acc + (curr.clr || 0), 0);
    const cci = Number((sumClr / eligibleCount).toFixed(4));

    // Find highest CLR and primary driver contaminant
    let maxClr = -1;
    let highestContaminant: ContaminantRegistryType | null = null;
    for (const r of eligibleClrResults) {
      if (r.clr !== null && r.clr > maxClr) {
        maxClr = r.clr;
        highestContaminant = r.contaminant;
      }
    }

    // Standardized Decision-Support Grade Mapping (FR-05-01 & FR-05-05)
    let grade: "A" | "B" | "C" | "D" | "F";
    if (cci < 0.3 && maxClr < 0.5) {
      grade = "A";
    } else if (cci < 0.6 && maxClr < 0.8) {
      grade = "B";
    } else if (cci < 0.8 && maxClr <= 1.0) {
      grade = "C";
    } else if (cci <= 1.0 && maxClr <= 1.2) {
      grade = "D";
    } else {
      grade = "F";
    }

    // Overall status assignment
    let overallStatusText: StatusCatalogueType;
    if (maxClr < 0.8) {
      overallStatusText = StatusCatalogue.ST_01_BELOW_LIMIT;
    } else if (maxClr < 1.0) {
      overallStatusText = StatusCatalogue.ST_02_CLOSE_TO_LIMIT;
    } else if (maxClr === 1.0) {
      overallStatusText = StatusCatalogue.ST_03_AT_LIMIT;
    } else {
      overallStatusText = StatusCatalogue.ST_04_ABOVE_LIMIT;
    }

    return {
      ruleVersion: ACTIVE_RULE_VERSION,
      isGradeEligible: true,
      overallStatusText,
      overallReasonCode: null,
      grade,
      cci,
      maxClr,
      highestContaminant,
      testedCount,
      eligibleCount,
      missingCount,
      ineligibleCount,
      clrBreakdown: clrResults,
      includedContaminants,
      excludedReasons,
      calculatedAt: new Date().toISOString(),
    };
  },
};

export default scoringService;
