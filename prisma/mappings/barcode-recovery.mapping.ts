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
    barcodes: ["8961008210537", "8961008220499"],
    offRecordName: "Nestle Cerelac 6 month large, Nestle Cerelac",
    matchConfidence: "Exact Brand & Product Line Match",
  },
  {
    productCode: "BBF-S14",
    category: "Cereal-based baby food",
    brand: "Nestle",
    sampleName: "Cerelac apple and orange",
    barcodes: ["8961008210537", "8961008220499"],
    offRecordName: "Nestle Cerelac 6 month large, Nestle Cerelac",
    matchConfidence: "Exact Brand & Product Line Match",
  },
  {
    productCode: "BBF-S10",
    category: "Infant formula milk",
    brand: "Nestle",
    sampleName: "Nan vanilla",
    barcodes: ["7613037038309", "4800361412445"],
    offRecordName: "NAN Optipro 1 (Nestle), NANGROW (nestle)",
    matchConfidence: "Exact Brand & Formula Line Match",
  },
  {
    productCode: "JU9",
    category: "Juices",
    brand: "Nesfruta",
    sampleName: "Apple Juice",
    barcodes: ["8961008213866", "8961008222790"],
    offRecordName: "Nesfruta, Nesfruta (Mango Fruit Drink) (Nestle)",
    matchConfidence: "Exact Brand Match",
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
    productCode: "JU12",
    category: "Juices",
    brand: "Tops",
    sampleName: "Apple Juice",
    barcodes: ["1860201810254"],
    offRecordName: "Frootopia (Tops, Category: Juice)",
    matchConfidence: "Brand & Category Match",
  },
  {
    productCode: "JU16",
    category: "Juices",
    brand: "Tops Pouch",
    sampleName: "Guava Juice",
    barcodes: ["1860201810254"],
    offRecordName: "Frootopia (Tops, Category: Juice)",
    matchConfidence: "Brand & Category Match",
  },
  {
    productCode: "JU17",
    category: "Juices",
    brand: "Tops",
    sampleName: "Guava Juice",
    barcodes: ["1860201810254"],
    offRecordName: "Frootopia (Tops, Category: Juice)",
    matchConfidence: "Brand & Category Match",
  },
  {
    productCode: "JU21",
    category: "Juices",
    brand: "Tops",
    sampleName: "Red Grapes Juice",
    barcodes: ["1860201810254"],
    offRecordName: "Frootopia (Tops, Category: Juice)",
    matchConfidence: "Brand & Category Match",
  },
  {
    productCode: "JU27",
    category: "Juices",
    brand: "Tops",
    sampleName: "Lychee Juice",
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
    offRecordName: "Kashmiri Tea (Vital Tea), everyday Kashmiri tea (nestle)",
    matchConfidence: "Category / Variant Match",
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
 * 52 Non-barcoded bulk and loose market commodities:
 * - 16 open-market bulk commodities
 * - 27 loose school-zone chocolates (CHOC-001 through CHOC-030 except CHOC-003)
 * - 9 origin loose teas
 */
export const BULK_LOOSE_COMMODITY_CODES = new Set<string>([
  // 16 Open-market bulk commodities
  "K11", "JU28", "JU33", "MM4", "MM5", "A10", "A11", "TEA-028", "TEA-035",
  "2014-KPK-HU01", "2014-KPK-HU02", "2014-KPK-HU03", "2014-KPK-HU04",
  "2014-KPK-HU05", "2014-KPK-HU06", "2014-KPK-HU07",
  // 27 Loose school-zone chocolates (CHOC-001 - CHOC-030 excluding CHOC-003)
  "CHOC-001", "CHOC-002", "CHOC-004", "CHOC-005", "CHOC-006", "CHOC-007",
  "CHOC-008", "CHOC-009", "CHOC-010", "CHOC-011", "CHOC-012", "CHOC-013",
  "CHOC-014", "CHOC-015", "CHOC-016", "CHOC-017", "CHOC-018", "CHOC-019",
  "CHOC-020", "CHOC-021", "CHOC-022", "CHOC-023", "CHOC-024", "CHOC-025",
  "CHOC-026", "CHOC-027", "CHOC-028", "CHOC-029", "CHOC-030",
  // 9 Unbranded/origin loose teas
  "TEA-009", "TEA-010", "TEA-011", "TEA-013", "TEA-016",
  "TEA-020", "TEA-021", "TEA-027", "TEA-029",
]);
