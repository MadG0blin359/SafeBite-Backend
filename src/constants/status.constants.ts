/**
 * SafeBite Constants & Status Catalogue
 * Implements Global Rule GR-05 (Table 4: Status Catalogue & Table 5: Reason Codes)
 * from SafeBite SRS v4.1.
 */

export const ACTIVE_RULE_VERSION = "1.0.0";

/**
 * Table 4: Status Catalogue
 * Exact display strings mandated by GR-05.
 */
export const StatusCatalogue = {
  // A. Per-contaminant comparison status
  ST_01_BELOW_LIMIT: "Below Limit",
  ST_02_CLOSE_TO_LIMIT: "Close to Limit",
  ST_03_AT_LIMIT: "At Limit",
  ST_04_ABOVE_LIMIT: "Above Limit",
  ST_05_NOT_TESTED: "Not Tested",
  ST_06_NO_APPLICABLE_LIMIT: "No Applicable Limit Found",
  ST_07_NOT_COMPARABLE: "Not Comparable",

  // B. Per-product analysis status
  ST_08_INSUFFICIENT_DATA: "Insufficient Data",

  // C. Lookup, cache, assistant, and health-context status
  ST_09_PRODUCT_NOT_FOUND: "Product Not Found",
  ST_10_CACHED_RESULT: "Cached Result",
  ST_11_CACHED_DATA_EXPIRED: "Cached Data Expired",
  ST_12_ASSISTANT_UNAVAILABLE: "Assistant Unavailable",
  ST_13_NO_SUPPORTING_EVIDENCE: "No Supporting Evidence Found",
  ST_14_NO_HEALTH_CONTEXT_EVIDENCE: "No Health-Context Evidence Found",
} as const;

export type StatusCatalogueType = (typeof StatusCatalogue)[keyof typeof StatusCatalogue];

/**
 * Table 5: Reason Codes
 * Standardized codes accompanying each status where applicable.
 */
export const ReasonCodes = {
  NO_MEASUREMENT: "NO_MEASUREMENT",
  NO_LIMIT: "NO_LIMIT",
  UNIT_MISSING: "UNIT_MISSING",
  UNIT_MISMATCH: "UNIT_MISMATCH",
  BASIS_MISMATCH: "BASIS_MISMATCH",
  RANGE_VALUE: "RANGE_VALUE",
  BELOW_LOD: "BELOW_LOD",
  LIMIT_NOT_CURRENT: "LIMIT_NOT_CURRENT",
  NOT_PRODUCT_SPECIFIC: "NOT_PRODUCT_SPECIFIC",
  MIN_ELIGIBLE_NOT_MET: "MIN_ELIGIBLE_NOT_MET",
  NO_RESEARCH_RECORD: "NO_RESEARCH_RECORD",
  NO_COMPARABLE_RESULTS: "NO_COMPARABLE_RESULTS",
  RULE_VERSION_MISMATCH: "RULE_VERSION_MISMATCH",
  NO_HEALTH_CONTEXT_EVIDENCE: "NO_HEALTH_CONTEXT_EVIDENCE",
} as const;

export type ReasonCodeType = (typeof ReasonCodes)[keyof typeof ReasonCodes];

/**
 * Initial Contaminant Registry as defined in SRS 3.2.3
 */
export const CONTAMINANT_REGISTRY = ["LEAD", "CADMIUM", "CHROMIUM", "COBALT", "COPPER"] as const;
export type ContaminantRegistryType = (typeof CONTAMINANT_REGISTRY)[number];

export const CONTAMINANT_SYMBOLS: Record<ContaminantRegistryType, string> = {
  LEAD: "Pb",
  CADMIUM: "Cd",
  CHROMIUM: "Cr",
  COBALT: "Co",
  COPPER: "Cu",
};

export const CONTAMINANT_NAMES: Record<ContaminantRegistryType, string> = {
  LEAD: "Lead",
  CADMIUM: "Cadmium",
  CHROMIUM: "Chromium",
  COBALT: "Cobalt",
  COPPER: "Copper",
};
