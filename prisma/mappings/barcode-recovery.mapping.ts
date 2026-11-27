/**
 * Barcode Recovery & Remediation Mapping
 * 
 * Bucket 1: 12 Missing Products Recovered From Pakistan_OFF_Repository via normalized matching
 * Bucket 2: 10 Truncated UPC-A Barcodes Restored From Invalid_Barcodes via restored leading zeros
 * Bucket 3: 52 Bulk & Loose Commodities identified for semantic & category-level routing
 */

export interface RecoveredBarcodeEntry {
  productCode: string;
  category: string;
  brand: string;
  sampleName: string;
  barcodes: string[];
  offRecordName: string;
  matchConfidence: string;
}

export interface RestoredUpcEntry {
  productCode: string;
  brandAndProduct: string;
  originalString: string;
  restoredUpcA: string;
  checkDigit: string;
}

/**
 * 12 Products recovered from Pakistan_OFF_Repository
 * Note: Specific product-line barcodes are split cleanly across SKUs so parent-brand
 * broad matches (e.g. MILK-008 Nestle milk pack) cannot hijack Cerelac / NAN / Nesfruta barcodes.
 */
export const RECOVERED_OFF_BARCODES: RecoveredBarcodeEntry[] = [
  {
    productCode: "CS3",
    category: "Corn Snacks",
    brand: "Catty chins",
    sampleName: "Corn Snack",
    barcodes: ["8964000585283"],
    offRecordName: "Catty chins (Brand: Not recorded in OFF)",
    matchConfidence: "Exact Product & Brand Match",
  },
  {
    productCode: "BBF-S13",
    category: "Cereal-based baby food",
    brand: "Nestle",
    sampleName: "Yogart+mango+orange",
    barcodes: ["8961008210537"],
    offRecordName: "Nestle Cerelac 6 month large",
    matchConfidence: "Exact Brand & Product Line Match (Reassigned from MILK-008)",
  },
  {
    productCode: "BBF-S14",
    category: "Cereal-based baby food",
    brand: "Nestle",
    sampleName: "Cerelac apple and orange",
    barcodes: ["8961008220499"],
    offRecordName: "Nestle Cerelac",
    matchConfidence: "Exact Brand & Product Line Match (Reassigned from MILK-008)",
  },
  {
    productCode: "BBF-S10",
    category: "Infant formula milk",
    brand: "Nestle",
    sampleName: "Nan vanilla",
    barcodes: ["7613037038309", "4800361412445"],
    offRecordName: "NAN Optipro 1 (Nestle), NANGROW (Nestle)",
    matchConfidence: "Exact Brand & Formula Line Match (Reassigned from MILK-008)",
  },
  {
    productCode: "JU9",
    category: "Juices",
    brand: "Nesfruta",
    sampleName: "Apple Juice",
    barcodes: ["8961008213866"],
    offRecordName: "Nesfruta (Nestle)",
    matchConfidence: "Exact Brand Match (Reassigned from MILK-008)",
  },
  {
    productCode: "JU3",
    category: "Juices",
    brand: "Nesfruta",
    sampleName: "Mango Juice",
    barcodes: ["8961008222790"],
    offRecordName: "Nesfruta Mango Fruit Drink (Nestle)",
    matchConfidence: "Exact Brand & Flavor Match (Reassigned from JU1)",
  },
  {
    productCode: "JU10",
    category: "Juices",
    brand: "Tops",
    sampleName: "Apple Juice",
    barcodes: ["1860201810254"],
    offRecordName: "Frootopia (Tops, Category: Juice)",
    matchConfidence: "Brand & Category Match",
  },
  {
    productCode: "TEA-019",
    category: "Tea",
    brand: "Kashmeri Green Tea",
    sampleName: "Kashmeri Green Tea",
    barcodes: ["8964001400349", "8961008300450", "8961008217277", "8961008217260"],
    offRecordName: "Kashmiri Tea (Vital Tea), Everyday Kashmiri Tea (Nestle)",
    matchConfidence: "Category / Variant Match (8961008300450 Reassigned from MILK-011)",
  },
];

/**
 * 10 Restored 12-digit UPC-A codes from Invalid_Barcodes (leading zeros restored)
 */
export const RESTORED_UPCA_BARCODES: RestoredUpcEntry[] = [
  {
    productCode: "C13",
    brandAndProduct: "California — Peach halves",
    originalString: "72830440042",
    restoredUpcA: "072830440042",
    checkDigit: "2 (Valid)",
  },
  {
    productCode: "PS8",
    brandAndProduct: "Pringles — Potato Snack",
    originalString: "03800013843",
    restoredUpcA: "003800013843",
    checkDigit: "3 (Valid)",
  },
  {
    productCode: "N2",
    brandAndProduct: "Knorr — Instant noodles",
    originalString: "55220060013",
    restoredUpcA: "055220060013",
    checkDigit: "3 (Valid)",
  },
  {
    productCode: "N4",
    brandAndProduct: "Shin Ramyun — Instant noodles",
    originalString: "31146013524",
    restoredUpcA: "031146013524",
    checkDigit: "4 (Valid)",
  },
  {
    productCode: "N5",
    brandAndProduct: "Indomie — Instant noodles (SKU 1)",
    originalString: "89686170726",
    restoredUpcA: "089686170726",
    checkDigit: "6 (Valid)",
  },
  {
    productCode: "N5",
    brandAndProduct: "Indomie — Instant noodles (SKU 2)",
    originalString: "89686130027",
    restoredUpcA: "089686130027",
    checkDigit: "7 (Valid)",
  },
  {
    productCode: "N5",
    brandAndProduct: "Indomie — Instant noodles (SKU 3)",
    originalString: "89686170795",
    restoredUpcA: "089686170795",
    checkDigit: "5 (Valid)",
  },
  {
    productCode: "N5",
    brandAndProduct: "Indomie — Instant noodles (SKU 4)",
    originalString: "89686180367",
    restoredUpcA: "089686180367",
    checkDigit: "7 (Valid)",
  },
  {
    productCode: "N5",
    brandAndProduct: "Indomie — Instant noodles (SKU 5)",
    originalString: "89686171679",
    restoredUpcA: "089686171679",
    checkDigit: "9 (Valid)",
  },
  {
    productCode: "N5",
    brandAndProduct: "Indomie — Instant noodles (SKU 6)",
    originalString: "89686010831",
    restoredUpcA: "089686010831",
    checkDigit: "1 (Valid)",
  },
];

/**
 * 27 Individually wrapped informal cottage-industry school-zone candies
 * (CHOC-001 through CHOC-030 excluding CHOC-003 Candyland commercial, CHOC-004 barcoded Milo Sip, and CHOC-029 barcoded)
 */
export const INFORMAL_WRAPPED_CANDY_CODES = new Set<string>([
  "CHOC-001", "CHOC-002", "CHOC-005", "CHOC-006", "CHOC-007", "CHOC-008",
  "CHOC-009", "CHOC-010", "CHOC-011", "CHOC-012", "CHOC-013", "CHOC-014",
  "CHOC-015", "CHOC-016", "CHOC-017", "CHOC-018", "CHOC-019", "CHOC-020",
  "CHOC-021", "CHOC-022", "CHOC-023", "CHOC-024", "CHOC-025", "CHOC-026",
  "CHOC-027", "CHOC-028", "CHOC-030",
]);

/**
 * 25 Genuine loose/open-market commodities (11 loose teas, 7 KPK floral honeys, 7 open street foods)
 */
export const TRUE_LOOSE_COMMODITY_CODES = new Set<string>([
  // 7 Open-market street foods
  "K11", "JU28", "JU33", "MM4", "MM5", "A10", "A11",
  // 7 KPK floral open-market honeys
  "2014-KPK-HU01", "2014-KPK-HU02", "2014-KPK-HU03", "2014-KPK-HU04",
  "2014-KPK-HU05", "2014-KPK-HU06", "2014-KPK-HU07",
  // 11 Unbranded/origin loose teas
  "TEA-009", "TEA-010", "TEA-011", "TEA-013", "TEA-016",
  "TEA-020", "TEA-021", "TEA-027", "TEA-028", "TEA-029", "TEA-035",
]);

/**
 * Backwards-compatible alias for genuine loose commodities
 */
export const BULK_LOOSE_COMMODITY_CODES = TRUE_LOOSE_COMMODITY_CODES;

/**
 * 8 Exact & spelling-duplicate commercial product rows merged into their canonical product codes
 * (duplicateProductCode -> canonicalProductCode)
 */
export const DUPLICATE_PRODUCT_MERGES: Record<string, string> = {
  JU12: "JU10",                     // Tops Apple Juice
  K9: "K4",                         // Bake Parlor Tomato Ketchup
  JM3: "JM1",                       // Mitchell's Strawberry Jam
  JM13: "JM11",                     // Mitchell's Mixed Fruit Jam
  "MILK-008": "MILK-006",           // Nestle MilkPak (merges "Nestle milk pack" -> "Milk Pak")
  "2019-SINDH-H11": "2014-KPK-H05", // Young's Honey (merges "Youngs honey" -> "Young's")
  "2014-KPK-H01": "2019-SINDH-H09", // Marhaba Honey (merges unbarcoded -> barcoded Marhaba honey)
  "2014-KPK-H07": "2019-SINDH-H12", // Langnese Honey (merges "Langness" -> barcoded "Lagneese honey")
};

/**
 * Product code prefixes belonging to non-consumer academic/blinded/raw/pooled research records
 * (kept in DB as RESEARCH_BENCHMARK with isConsumerFacing=false unless zero-data placeholder)
 */
export const NON_CONSUMER_RESEARCH_PREFIXES = new Set<string>([
  // Pooled statistical meta-aggregates
  "CNF", "BDJ", "BDS", "RYO", "RCE", "CHC2",
  // Blinded / anonymized research study codes
  "JFS", "BEV", "MNJ", "RSK", "RWM", "TEA2", "TEA3", "KSP", "BSM",
  // Raw farm produce & animal organ samples
  "VEG", "MET", "BRL", "EGA", "EGY", "SND",
]);
