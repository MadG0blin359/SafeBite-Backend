/**
 * Display Brand & Product Name Normalization Dictionary
 *
 * Fixes OCR/spreadsheet typos, inconsistent capitalization, and duplicate word artifacts
 * while keeping ASCII-safe spellings (e.g. "Nestle") so standard SQL ILIKE searches work cleanly.
 */

export interface DisplayOverride {
  brand?: string;
  name?: string;
}

const PRODUCT_DISPLAY_OVERRIDES: Record<string, DisplayOverride> = {
  // Packaged Milk & Dairy Whiteners
  "MILK-002": { brand: "Engro Foods", name: "Olper's Full Cream Milk" },
  "MILK-004": { brand: "Engro Foods", name: "Tarang Tea Whitener" },
  "MILK-006": { brand: "Nestle", name: "Nestle MilkPak Full Cream Milk" },
  "MILK-007": { brand: "Engro Foods", name: "Dairy Omung" },
  "MILK-011": { brand: "Nestle", name: "Nestle Everyday" },
  "MILK-012": { brand: "Qudrat", name: "Qudrat Milk" },
  "MILK-013": { brand: "Nestle", name: "Nestle Nesvita" },

  // Honey
  "2014-KPK-H02": { brand: "Qarshi", name: "Qarshi Honey" },
  "2014-KPK-H03": { brand: "Versatile", name: "Versatile Honey" },
  "2014-KPK-H04": { brand: "Al-Hayat", name: "Al-Hayat Honey" },
  "2014-KPK-H05": { brand: "Young's", name: "Young's Honey" },
  "2014-KPK-H06": { brand: "Pak-Salman", name: "Pak-Salman Honey" },
  "2019-SINDH-H09": { brand: "Marhaba", name: "Marhaba Honey" },
  "2019-SINDH-H10": { brand: "Hashmi", name: "Hashmi Honey" },
  "2019-SINDH-H12": { brand: "Langnese", name: "Langnese Honey" },

  // Infant Formula & Baby Foods
  "BBF-S1": { brand: "Nestle", name: "NAN 1 Infant Formula" },
  "BBF-S5": { brand: "Morinaga", name: "Morinaga 1 Infant Formula" },
  "BBF-S6": { brand: "Nestle", name: "NAN 2 Pro Infant Formula" },
  "BBF-S10": { brand: "Nestle", name: "NAN Vanilla" },
  "BBF-S11": { brand: "Nestle", name: "Cerelac Rice" },
  "BBF-S12": { brand: "Nestle", name: "Cerelac 3 Fruits" },
  "BBF-S13": { brand: "Nestle", name: "Cerelac Yogurt, Mango & Orange" },
  "BBF-S14": { brand: "Nestle", name: "Cerelac Apple & Orange" },
  "BBF-S15": { brand: "Nestle", name: "Cerelac Wheat & Honey" },
  "BBF-S16": { brand: "Nestle", name: "Cerelac Strawberry" },
  "BBF-S17": { brand: "Nestle", name: "Cerelac Wheat" },
  "BBF-S18": { brand: "GSK", name: "Horlicks Wheat" },
  "BBF-S19": { brand: "Complan", name: "Complan Chocolate" },
  "BBF-S20": { brand: "Complan", name: "Complan Strawberry" },
  "BBF-S21": { brand: "Complan", name: "Complan Vanilla" },
  "BBF-S22": { brand: "GSK", name: "Horlicks Chocolate" },
  "BBF-S23": { brand: "Kellogg's", name: "Kellogg's Chocos" },
  "BBF-S24": { brand: "GSK", name: "Horlicks Junior" },
  "BBF-S25": { brand: "Nestle", name: "Nido Bunyad" },
  "BBF-S26": { brand: "Cadbury", name: "Bournvita Chocolate" },

  // Instant Noodles & Snacks
  N4: { brand: "Nongshim", name: "Shin Ramyun Instant Noodles" },
  CS3: { brand: "Catty Chins", name: "Corn Snack" },
  PS4: { brand: "Super Crisp", name: "Potato Snack" },
  PS7: { brand: "Wavy", name: "Potato Snack" },

  // Juices & Sauces
  JU16: { brand: "Tops", name: "Guava Juice (Pouch)" },
  JU24: { brand: "Rani", name: "Rani Float Peach Juice" },
  JU30: { brand: "Shezan", name: "Fruit Punch (250ml)" },
  K8: { brand: "Best Foods", name: "Tomato Ketchup" },

  // Tea (Packaged & Loose)
  "TEA-001": { brand: "Lipton", name: "Lipton Yellow Label" },
  "TEA-002": { brand: "Lipton", name: "Lipton Tea Bag" },
  "TEA-003": { brand: "Brooke Bond", name: "Brooke Bond Supreme" },
  "TEA-005": { brand: "Tapal", name: "Tapal Tezdum" },
  "TEA-006": { brand: "Tapal", name: "Tapal Danedar" },
  "TEA-007": { brand: "Tapal", name: "Tapal Family Mixture" },
  "TEA-008": { brand: "Tapal", name: "Tapal Tea Bag" },
  "TEA-009": { brand: "Kenya Danedar", name: "Kenya Danedar (Loose Tea)" },
  "TEA-010": { brand: "Kenya Chai", name: "Kenya Chai (Loose Tea)" },
  "TEA-014": { brand: "Tetley", name: "Tetley Black Tea" },
  "TEA-015": { brand: "Tetley", name: "Tetley Tea Bag" },
  "TEA-019": { brand: "Kashmiri Green Tea", name: "Kashmiri Green Tea" },

  // Chocolates & School-Zone Informal Candies
  "CHOC-003": { brand: "Candyland", name: "Candyland Paradise Coconut Filled Chocolate" },
  "CHOC-004": { brand: "Spencer", name: "Spencer Milo Sip White Liquid Chocolate" },
  "CHOC-008": { brand: "City Boy", name: "City Boy Chocolate Balls" },
  "CHOC-025": { brand: "Mickey Mouse Love", name: "Mickey Mouse Love Chocolate" },
  "CHOC-027": { brand: "Doraemon", name: "Doraemon Chocolates" },
};

const BRAND_SPELLING_NORMALIZATIONS: Record<string, string> = {
  "fruit tree": "Fruit Tree",
  "fine life": "Fine Life",
  "best food": "Best Foods",
};

export function normalizeProductDisplay(
  productCode: string,
  rawBrand: string,
  rawName: string
): { brand: string; name: string } {
  const override = PRODUCT_DISPLAY_OVERRIDES[productCode];
  let brand = override?.brand ?? rawBrand;
  const name = override?.name ?? rawName;

  const mappedBrand = BRAND_SPELLING_NORMALIZATIONS[brand.toLowerCase().trim()];
  if (mappedBrand && !override?.brand) {
    brand = mappedBrand;
  }

  return { brand, name };
}
