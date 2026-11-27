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
  rawLOD?: number | null;
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
 * Checks whether measurement basis and standard basis are mathematically comparable.
 * - "volume" only compares with "volume"
 * - Generic "mass" on a mass standard compares compatibly with "mass", "wet_mass", or "dry_mass"
 * - Explicit "wet_mass" vs "dry_mass" rejects comparison as BASIS_MISMATCH
 */
function areBasesComparable(measurementBasis?: string | null, referenceBasis?: string | null): boolean {
  if (!measurementBasis || !referenceBasis) {
    return true;
  }

  const m = measurementBasis.toLowerCase().trim();
  const r = referenceBasis.toLowerCase().trim();

  if (m === r) {
    return true;
  }

  // Cross-domain comparability:
  // For aqueous liquid foods (milk, juices, beverages), 1 L ≈ 1 kg at standard aqueous density (1.0 kg/L).
  // Thus volume basis (mg/L) and mass/wet_mass basis (mg/kg, ppm) are mathematically comparable.
  if (
    (m === "volume" && (r === "mass" || r === "wet_mass")) ||
    (r === "volume" && (m === "mass" || m === "wet_mass"))
  ) {
    return true;
  }

  if (m === "volume" || r === "volume") {
    return false; // Incompatible with dry_mass
  }

  if (m === "mass" || r === "mass") {
    return (
      (m === "mass" || m === "wet_mass" || m === "dry_mass") &&
      (r === "mass" || r === "wet_mass" || r === "dry_mass")
    );
  }

  return false;
}

/**
 * Checks unit domain compatibility (mass units vs volume units) when explicit basis is absent.
 */
function getUnitDomain(unit: string): "mass" | "volume" | "unknown" {
  const u = unit.toLowerCase().trim();
  if (u === "mg/l" || u === "ug/l" || u === "µg/l" || u === "μg/l") return "volume";
  if (u === "mg/kg" || u === "ppm" || u === "ug/kg" || u === "µg/kg" || u === "μg/kg" || u === "ppb" || u === "g/kg" || u === "%") {
    return "mass";
  }
  return "unknown";
}

/**
 * Normalizes units to mg/kg (or mg/L for volume) for mathematical comparability.
 */
function normalizeConcentrationToMgKg(val: number, unit: string): number | null {
  const normalizedUnit = unit.toLowerCase().trim();
  if (normalizedUnit === "mg/kg" || normalizedUnit === "ppm" || normalizedUnit === "mg/l") {
    return val;
  }
  if (
    normalizedUnit === "ug/kg" ||
    normalizedUnit === "ppb" ||
    normalizedUnit === "ug/l" ||
    normalizedUnit === "µg/kg" ||
    normalizedUnit === "μg/kg" ||
    normalizedUnit === "µg/l" ||
    normalizedUnit === "μg/l"
  ) {
    return val / 1000.0;
  }
  if (normalizedUnit === "g/kg") {
    return val * 1000.0;
  }
  if (normalizedUnit === "%") {
    return val * 10000.0;
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

    // Rule GR-01 & WHO/GEMS-Food Non-Detect Convention:
    // Handle BELOW_LOD BEFORE checking null concentration (lab "ND" / "BDL" records store concentration=null).
    if (measurement && measurement.measurementStatus === "BELOW_LOD") {
      if (!primaryRef || primaryRef.limitValue === null || primaryRef.limitValue <= 0) {
        return {
          contaminant,
          contaminantName,
          contaminantSymbol,
          measuredConcentration: measurement.concentration ?? null,
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

      const normLimit = primaryRef.unit ? normalizeConcentrationToMgKg(primaryRef.limitValue, primaryRef.unit) : null;
      const measDomain = measurement.unit ? getUnitDomain(measurement.unit) : "unknown";
      const limitDomain = primaryRef.unit ? getUnitDomain(primaryRef.unit) : "unknown";
      const isDomainCompatible =
        measDomain === "unknown" ||
        limitDomain === "unknown" ||
        measDomain === limitDomain ||
        ((measDomain === "volume" || limitDomain === "volume") &&
          primaryRef.basis !== "dry_mass" &&
          measurement.basis !== "dry_mass");

      if (normLimit === null || !isDomainCompatible) {
        return {
          contaminant,
          contaminantName,
          contaminantSymbol,
          measuredConcentration: measurement.concentration ?? null,
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

      if (!areBasesComparable(measurement.basis, primaryRef.basis)) {
        return {
          contaminant,
          contaminantName,
          contaminantSymbol,
          measuredConcentration: measurement.concentration ?? null,
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

      // If numeric LOD is reported, verify LOD <= limit and apply WHO 0.5 * LOD middle-bound imputation;
      // if rawLOD is unstated ("ND" / "BDL" in published tables), treat as confirmed compliant non-detect (CLR = 0).
      let imputedClr = 0;
      if (measurement.rawLOD !== null && measurement.rawLOD !== undefined && measurement.rawLOD > 0) {
        const normLod = measurement.unit
          ? normalizeConcentrationToMgKg(measurement.rawLOD, measurement.unit)
          : measurement.rawLOD;
        if (normLod === null || normLod > normLimit) {
          return {
            contaminant,
            contaminantName,
            contaminantSymbol,
            measuredConcentration: measurement.concentration ?? null,
            unit: measurement.unit || null,
            basis: measurement.basis || null,
            evidenceLevel,
            statusText: StatusCatalogue.ST_07_NOT_COMPARABLE,
            reasonCode: ReasonCodes.BELOW_LOD,
            isEligibleForCci: false,
            clr: null,
            normalizedMargin: null,
            selectedReference: primaryRef,
            sourceInfo: measurement.sourceInfo || null,
          };
        }
        imputedClr = Number(((0.5 * normLod) / normLimit).toFixed(4));
      }

      const normalizedMargin = Number((1.0 - imputedClr).toFixed(4));
      return {
        contaminant,
        contaminantName,
        contaminantSymbol,
        measuredConcentration: measurement.concentration ?? null,
        unit: measurement.unit || null,
        basis: measurement.basis || null,
        evidenceLevel,
        statusText: StatusCatalogue.ST_01_BELOW_LIMIT,
        reasonCode: ReasonCodes.BELOW_LOD,
        isEligibleForCci: true,
        clr: imputedClr,
        normalizedMargin,
        selectedReference: primaryRef,
        sourceInfo: measurement.sourceInfo || null,
      };
    }

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

    // Comparability check: Unit matching & domain check (mass vs volume)
    const normConc = measurement.unit ? normalizeConcentrationToMgKg(measurement.concentration, measurement.unit) : null;
    const normLimit = primaryRef.unit ? normalizeConcentrationToMgKg(primaryRef.limitValue, primaryRef.unit) : null;
    const measDomain = measurement.unit ? getUnitDomain(measurement.unit) : "unknown";
    const limitDomain = primaryRef.unit ? getUnitDomain(primaryRef.unit) : "unknown";

    const isDomainCompatible =
      measDomain === "unknown" ||
      limitDomain === "unknown" ||
      measDomain === limitDomain ||
      // Aqueous liquid equivalence: volume (mg/L) is comparable to mass (mg/kg, ppm) for non-dry limits
      ((measDomain === "volume" || limitDomain === "volume") &&
        primaryRef.basis !== "dry_mass" &&
        measurement.basis !== "dry_mass");

    if (normConc === null || normLimit === null || !isDomainCompatible) {
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

    // Comparability check: Basis matching (e.g. wet_mass vs dry_mass, mass vs volume)
    if (!areBasesComparable(measurement.basis, primaryRef.basis)) {
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

    // Secondary EU comparison calculation (if unit & basis are comparable)
    let secondaryResult: ClrCalculationResult["secondaryReference"] = null;
    if (secondaryRef && secondaryRef.limitValue > 0) {
      const euNormLimit = normalizeConcentrationToMgKg(secondaryRef.limitValue, secondaryRef.unit);
      const euDomain = secondaryRef.unit ? getUnitDomain(secondaryRef.unit) : "unknown";
      const isSecondaryDomainCompatible =
        measDomain === "unknown" || euDomain === "unknown" || measDomain === euDomain;
      if (
        euNormLimit !== null &&
        isSecondaryDomainCompatible &&
        areBasesComparable(measurement.basis, secondaryRef.basis)
      ) {
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
    // GR-03: PRODUCT_SPECIFIC and BRAND_LEVEL evidence are eligible for product CCI.
    const isEligibleForCci = evidenceLevel === "PRODUCT_SPECIFIC" || evidenceLevel === "BRAND_LEVEL";

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
