import {
  StatusCatalogue,
  ReasonCodes,
  StatusCatalogueType,
  ReasonCodeType,
  ContaminantRegistryType,
  CONTAMINANT_NAMES,
  CONTAMINANT_SYMBOLS,
} from "../constants/status.constants.js";

export interface ContaminantMeasurementInput {
  contaminant: ContaminantRegistryType;
  concentration?: number | null;
  unit?: string | null;
  basis?: string | null; // e.g. "wet_mass", "dry_mass"
  evidenceLevel?: "PRODUCT_SPECIFIC" | "BRAND_LEVEL" | "CATEGORY_LEVEL";
  measurementStatus?: string | null; // "MEASURED", "NOT_TESTED", "BELOW_LOD", "RANGE_VALUE"
  sourceInfo?: {
    title?: string;
    doi?: string | null;
    url?: string | null;
    authors?: string;
    year?: number;
    journal?: string | null;
  } | null;
}

export interface ReferenceLimitInput {
  id: string;
  authority: "PSQCA" | "CODEX" | "EU";
  standardCode: string;
  version: string;
  limitValue: number;
  unit: string;
  basis: string;
  referenceRole: "PRIMARY_NATIONAL" | "INTERNATIONAL_FALLBACK" | "SECONDARY_COMPARISON";
  notes?: string | null;
  sourceUrl?: string | null;
}

export interface ClrCalculationResult {
  contaminant: ContaminantRegistryType;
  contaminantName: string;
  contaminantSymbol: string;
  measuredConcentration: number | null;
  unit: string | null;
  basis: string | null;
  evidenceLevel: "PRODUCT_SPECIFIC" | "BRAND_LEVEL" | "CATEGORY_LEVEL" | null;
  statusText: StatusCatalogueType;
  reasonCode: ReasonCodeType | null;
  isEligibleForCci: boolean;
  clr: number | null;
  normalizedMargin: number | null;
  selectedReference: ReferenceLimitInput | null;
  secondaryReference?: {
    reference: ReferenceLimitInput;
    clr: number | null;
    statusText: StatusCatalogueType;
  } | null;
  sourceInfo?: ContaminantMeasurementInput["sourceInfo"];
}

/**
 * Normalizes units to mg/kg (ppm) for mathematical comparability.
 */
function normalizeConcentrationToMgKg(val: number, unit: string): number | null {
  const normalizedUnit = unit.toLowerCase().trim();
  if (normalizedUnit === "mg/kg" || normalizedUnit === "ppm" || normalizedUnit === "mg/l") {
    return val;
  }
  if (normalizedUnit === "ug/kg" || normalizedUnit === "ppb" || normalizedUnit === "ug/l" || normalizedUnit === "µg/kg") {
    return val / 1000.0;
  }
  if (normalizedUnit === "g/kg" || normalizedUnit === "%") {
    return val * 1000.0;
  }
  return null; // Incompatible unit
}

export const clrService = {
  /**
   * Calculates Concentration-to-Limit Ratio (CLR) and Normalized Margin
   * for a single contaminant according to Equations 3.1 & 3.2 and FR-04.
   */
  calculateClr(
    contaminant: ContaminantRegistryType,
    measurement?: ContaminantMeasurementInput | null,
    primaryRef?: ReferenceLimitInput | null,
    secondaryRef?: ReferenceLimitInput | null
  ): ClrCalculationResult {
    const contaminantName = CONTAMINANT_NAMES[contaminant] || contaminant;
    const contaminantSymbol = CONTAMINANT_SYMBOLS[contaminant] || "";
    const evidenceLevel = measurement?.evidenceLevel || null;

    // Rule GR-01: Check for missing measurement
    if (
      !measurement ||
      measurement.concentration === null ||
      measurement.concentration === undefined ||
      measurement.measurementStatus === "NOT_TESTED"
    ) {
      return {
        contaminant,
        contaminantName,
        contaminantSymbol,
        measuredConcentration: null,
        unit: measurement?.unit || null,
        basis: measurement?.basis || null,
        evidenceLevel,
        statusText: StatusCatalogue.ST_05_NOT_TESTED,
        reasonCode: ReasonCodes.NO_MEASUREMENT,
        isEligibleForCci: false,
        clr: null,
        normalizedMargin: null,
        selectedReference: primaryRef || null,
        sourceInfo: measurement?.sourceInfo || null,
      };
    }

    // Check measurement status edge cases
    if (measurement.measurementStatus === "BELOW_LOD") {
      return {
        contaminant,
        contaminantName,
        contaminantSymbol,
        measuredConcentration: measurement.concentration,
        unit: measurement.unit || null,
        basis: measurement.basis || null,
        evidenceLevel,
        statusText: StatusCatalogue.ST_07_NOT_COMPARABLE,
        reasonCode: ReasonCodes.BELOW_LOD,
        isEligibleForCci: false,
        clr: null,
        normalizedMargin: null,
        selectedReference: primaryRef || null,
        sourceInfo: measurement.sourceInfo || null,
      };
    }

    if (measurement.measurementStatus === "RANGE_VALUE") {
      return {
        contaminant,
        contaminantName,
        contaminantSymbol,
        measuredConcentration: measurement.concentration,
        unit: measurement.unit || null,
        basis: measurement.basis || null,
        evidenceLevel,
        statusText: StatusCatalogue.ST_07_NOT_COMPARABLE,
        reasonCode: ReasonCodes.RANGE_VALUE,
        isEligibleForCci: false,
        clr: null,
        normalizedMargin: null,
        selectedReference: primaryRef || null,
        sourceInfo: measurement.sourceInfo || null,
      };
    }

    // Check for missing primary reference limit
    if (!primaryRef || primaryRef.limitValue === null || primaryRef.limitValue <= 0) {
      return {
        contaminant,
        contaminantName,
        contaminantSymbol,
        measuredConcentration: measurement.concentration,
        unit: measurement.unit || null,
        basis: measurement.basis || null,
        evidenceLevel,
        statusText: StatusCatalogue.ST_06_NO_APPLICABLE_LIMIT,
        reasonCode: ReasonCodes.NO_LIMIT,
        isEligibleForCci: false,
        clr: null,
        normalizedMargin: null,
        selectedReference: null,
        sourceInfo: measurement.sourceInfo || null,
      };
    }

    // Comparability check: Unit matching
    const normConc = measurement.unit ? normalizeConcentrationToMgKg(measurement.concentration, measurement.unit) : null;
    const normLimit = primaryRef.unit ? normalizeConcentrationToMgKg(primaryRef.limitValue, primaryRef.unit) : null;

    if (normConc === null || normLimit === null) {
      return {
        contaminant,
        contaminantName,
        contaminantSymbol,
        measuredConcentration: measurement.concentration,
        unit: measurement.unit || null,
        basis: measurement.basis || null,
        evidenceLevel,
        statusText: StatusCatalogue.ST_07_NOT_COMPARABLE,
        reasonCode: ReasonCodes.UNIT_MISMATCH,
        isEligibleForCci: false,
        clr: null,
        normalizedMargin: null,
        selectedReference: primaryRef,
        sourceInfo: measurement.sourceInfo || null,
      };
    }

    // Comparability check: Basis matching (e.g. wet_mass vs dry_mass)
    if (
      measurement.basis &&
      primaryRef.basis &&
      measurement.basis.toLowerCase().trim() !== primaryRef.basis.toLowerCase().trim()
    ) {
      return {
        contaminant,
        contaminantName,
        contaminantSymbol,
        measuredConcentration: measurement.concentration,
        unit: measurement.unit || null,
        basis: measurement.basis || null,
        evidenceLevel,
        statusText: StatusCatalogue.ST_07_NOT_COMPARABLE,
        reasonCode: ReasonCodes.BASIS_MISMATCH,
        isEligibleForCci: false,
        clr: null,
        normalizedMargin: null,
        selectedReference: primaryRef,
        sourceInfo: measurement.sourceInfo || null,
      };
    }

    // Mathematical Calculation (Equation 3.1 & 3.2)
    const clr = Number((normConc / normLimit).toFixed(4));
    const normalizedMargin = Number((1.0 - clr).toFixed(4));

    // Band Classification (FR-04-05)
    let statusText: StatusCatalogueType;
    if (clr < 0.8) {
      statusText = StatusCatalogue.ST_01_BELOW_LIMIT;
    } else if (clr < 1.0) {
      statusText = StatusCatalogue.ST_02_CLOSE_TO_LIMIT;
    } else if (clr === 1.0) {
      statusText = StatusCatalogue.ST_03_AT_LIMIT;
    } else {
      statusText = StatusCatalogue.ST_04_ABOVE_LIMIT;
    }

    // Secondary EU comparison calculation (if available)
    let secondaryResult: ClrCalculationResult["secondaryReference"] = null;
    if (secondaryRef && secondaryRef.limitValue > 0) {
      const euNormLimit = normalizeConcentrationToMgKg(secondaryRef.limitValue, secondaryRef.unit);
      if (euNormLimit !== null) {
        const euClr = Number((normConc / euNormLimit).toFixed(4));
        let euStatus: StatusCatalogueType;
        if (euClr < 0.8) euStatus = StatusCatalogue.ST_01_BELOW_LIMIT;
        else if (euClr < 1.0) euStatus = StatusCatalogue.ST_02_CLOSE_TO_LIMIT;
        else if (euClr === 1.0) euStatus = StatusCatalogue.ST_03_AT_LIMIT;
        else euStatus = StatusCatalogue.ST_04_ABOVE_LIMIT;

        secondaryResult = {
          reference: secondaryRef,
          clr: euClr,
          statusText: euStatus,
        };
      }
    }

    // Eligibility check for product-level CCI:
    // GR-03: Only PRODUCT_SPECIFIC evidence can contribute to CCI.
    const isEligibleForCci = evidenceLevel === "PRODUCT_SPECIFIC";

    return {
      contaminant,
      contaminantName,
      contaminantSymbol,
      measuredConcentration: measurement.concentration,
      unit: measurement.unit || null,
      basis: measurement.basis || null,
      evidenceLevel,
      statusText,
      reasonCode: !isEligibleForCci ? ReasonCodes.NOT_PRODUCT_SPECIFIC : null,
      isEligibleForCci,
      clr,
      normalizedMargin,
      selectedReference: primaryRef,
      secondaryReference: secondaryResult,
      sourceInfo: measurement.sourceInfo || null,
    };
  },
};

export default clrService;
