import {
  StatusCatalogue,
  ReasonCodes,
  CONTAMINANT_NAMES,
  CONTAMINANT_SYMBOLS,
} from "../constants/status.constants.js";
import { ProductSafetyScoreResult } from "./scoring.service.js";

export interface PlainLanguageInterpretation {
  headline: string;
  summary: string;
  driverContaminantExplanation: string | null;
  evidenceTransparencyNotice: string;
  disclaimer: string;
  contaminantSummaries: Array<{
    contaminant: string;
    symbol: string;
    status: string;
    description: string;
    referenceLimitApplied: string | null;
  }>;
}

export const interpretationService = {
  /**
   * Generates a concise, plain-language interpretation of the deterministic analysis
   * following FR-07 and Global Rule GR-04.
   */
  generateInterpretation(
    productName: string,
    scoreResult: ProductSafetyScoreResult
  ): PlainLanguageInterpretation {
    const disclaimer =
      "SafeBite provides concentration-comparison data based on published studies and regulatory standards. " +
      "It does not perform laboratory testing, provide medical diagnosis, calculate dietary exposure, or guarantee food safety.";

    // Case 1: Insufficient Data
    if (!scoreResult.isGradeEligible) {
      let reasonExplanation = "There is insufficient scientific evidence available to calculate an overall safety grade.";

      if (scoreResult.overallReasonCode === ReasonCodes.NO_RESEARCH_RECORD) {
        reasonExplanation = "No peer-reviewed research record was found for this specific product in the database.";
      } else if (scoreResult.overallReasonCode === ReasonCodes.MIN_ELIGIBLE_NOT_MET) {
        reasonExplanation =
          "The available study data does not meet the minimum evidence threshold " +
          "(at least 2 comparable product-specific measurements including Lead or Cadmium).";
      }

      return {
        headline: `${productName}: Insufficient Data for Safety Grading`,
        summary: reasonExplanation,
        driverContaminantExplanation: null,
        evidenceTransparencyNotice:
          "Untested or brand/category-level estimates are never assumed to be zero (Rule GR-01).",
        disclaimer,
        contaminantSummaries: scoreResult.clrBreakdown.map((item) => ({
          contaminant: item.contaminantName,
          symbol: item.contaminantSymbol,
          status: item.statusText,
          description:
            item.statusText === StatusCatalogue.ST_05_NOT_TESTED
              ? "Not tested in available literature."
              : item.statusText === StatusCatalogue.ST_06_NO_APPLICABLE_LIMIT
              ? "Measured, but no applicable regulatory limit found for this category."
              : `Status: ${item.statusText} (${item.reasonCode || "not eligible for grading"})`,
          referenceLimitApplied: item.selectedReference
            ? `${item.selectedReference.authority} ${item.selectedReference.standardCode}: ${item.selectedReference.limitValue} ${item.selectedReference.unit}`
            : null,
        })),
      };
    }

    // Case 2: Grade Eligible with valid CCI and CLR
    const gradeLetter = scoreResult.grade || "F";
    const highestName = scoreResult.highestContaminant
      ? CONTAMINANT_NAMES[scoreResult.highestContaminant]
      : "tested contaminants";
    const maxClrVal = scoreResult.maxClr !== null ? scoreResult.maxClr : 0;

    let headline = `${productName}: Decision-Support Grade ${gradeLetter}`;
    let summary = "";

    if (gradeLetter === "A" || gradeLetter === "B") {
      summary =
        `All eligible tested heavy metals for ${productName} were found within regulatory limits, ` +
        `yielding a Cumulative Contamination Index (CCI) of ${scoreResult.cci}.`;
    } else if (gradeLetter === "C") {
      summary =
        `Eligible heavy metal levels are close to the regulatory limits, with an overall CCI of ${scoreResult.cci}. ` +
        `The primary contributor is ${highestName}.`;
    } else {
      summary =
        `One or more heavy metal concentrations exceeded the applicable regulatory standards (maximum CLR: ${maxClrVal}). ` +
        `The primary concern is driven by reported ${highestName} levels.`;
    }

    let driverExplanation = null;
    if (scoreResult.highestContaminant && maxClrVal > 0) {
      driverExplanation =
        `${highestName} is the primary driver of this result with a Concentration-to-Limit Ratio of ${maxClrVal} ` +
        `(${maxClrVal > 1.0 ? "exceeding" : "under"} the applicable standard).`;
    }

    const contaminantSummaries = scoreResult.clrBreakdown.map((item) => {
      let desc = "";
      if (item.clr !== null && item.selectedReference) {
        const pct = (item.clr * 100).toFixed(1);
        desc = `Reported concentration of ${item.measuredConcentration} ${item.unit} represents ${pct}% of the applicable ${item.selectedReference.authority} limit (${item.selectedReference.limitValue} ${item.selectedReference.unit}).`;
      } else {
        desc = item.statusText;
      }

      return {
        contaminant: item.contaminantName,
        symbol: item.contaminantSymbol,
        status: item.statusText,
        description: desc,
        referenceLimitApplied: item.selectedReference
          ? `${item.selectedReference.authority} (${item.selectedReference.standardCode})`
          : null,
      };
    });

    return {
      headline,
      summary,
      driverContaminantExplanation: driverExplanation,
      evidenceTransparencyNotice:
        `Computed using active rule version ${scoreResult.ruleVersion}. ` +
        `Based on ${scoreResult.eligibleCount} product-specific measurements. Missing data is never treated as zero.`,
      disclaimer,
      contaminantSummaries,
    };
  },
};

export default interpretationService;
