import { ContaminantType, ReferenceRole } from "@prisma/client";

export const SAFEBITE_CATEGORIES = [
  "Packaged Liquid Milk",
  "Bottled Natural Mineral Water",
  "Carbonated Beverages & Juices",
  "Instant Noodles",
  "Chocolates & Confectionery",
  "Commercial Bread & Bakery",
  "Packaged Tea & Coffee",
  "Processed Fruit & Sauces",
  "Spices & Condiments",
  "Edible Oils & Ghee",
  "Infant Formula & Baby Foods",
  "Biscuits & Cookies",
  "Snack Foods & Chips",
  "Rice & Basmati Grains",
  "Wheat Flour & Atta",
  "Pulses & Lentils",
  "Dairy - Yogurt & Butter",
  "Canned Vegetables & Pickles",
  "Poultry & Meat Products",
  "Seafood & Fish",
  "Honey & Sweeteners",
] as const;

export const ELEMENT_TO_CONTAMINANT: Record<string, ContaminantType> = {
  Lead: ContaminantType.LEAD,
  Cadmium: ContaminantType.CADMIUM,
  Chromium: ContaminantType.CHROMIUM,
  Cobalt: ContaminantType.COBALT,
  Copper: ContaminantType.COPPER,
};

export const EXCLUDED_CATEGORY_PATTERNS = [
  /^Wine\b/i,
  /^Fortified \/ Liqueur wine$/i,
  /Food Colou?ring Matter/i,
  /^Caramel Food Color$/i,
  /^Aspartame\b/i,
  /^Neotame\b/i,
  /^Steviol Glycosides\b/i,
  /^Saccharin\b/i,
];

export const PSQCA_CATEGORY_MAP: Record<string, string> = {
  "Baking Powder": "Commercial Bread & Bakery",
  "Banaspati": "Edible Oils & Ghee",
  "Bay Leaves (Whole and Ground)": "Spices & Condiments",
  "Berries and other small fruits": "Processed Fruit & Sauces",
  "Biscuits": "Biscuits & Cookies",
  "Bottled Natural Mineral Water": "Bottled Natural Mineral Water",
  "Bouillons and Consommes": "Spices & Condiments",
  "Brassica vegetables": "Canned Vegetables & Pickles",
  "Bulb vegetables": "Canned Vegetables & Pickles",
  "Butter Oil, Anhydrous Butter Oil and Anhydrous Milk Fat": "Dairy - Yogurt & Butter",
  "Canned Mackerel": "Seafood & Fish",
  "Canned Maize or Corn (Sweet Corn)": "Canned Vegetables & Pickles",
  "Canned chestnuts and canned chestnuts puree": "Processed Fruit & Sauces",
  "Canned fruits": "Processed Fruit & Sauces",
  "Canned vegetables": "Canned Vegetables & Pickles",
  "Carbonated Beverages": "Carbonated Beverages & Juices",
  "Cattle, edible offal of": "Poultry & Meat Products",
  "Cephalopods": "Seafood & Fish",
  "Cereal grains": "Wheat Flour & Atta",
  "Cheese and Cheese Analogues": "Dairy - Yogurt & Butter",
  "Chocolate containing or declaring ≥ 50% to < 70% total cocoa solids on a dry matter basis":
    "Chocolates & Confectionery",
  "Chocolate containing or declaring ≥ 70% total cocoa solids on a dry matter basis":
    "Chocolates & Confectionery",
  "Cooking Oil (Blended)": "Edible Oils & Ghee",
  "Coriander Seeds (Whole)": "Spices & Condiments",
  "Cranberry": "Processed Fruit & Sauces",
  "Currants": "Processed Fruit & Sauces",
  "Dairy Drink": "Packaged Liquid Milk",
  "Dried Milk Powder for Making Tea": "Packaged Liquid Milk",
  "Dried Sage (Whole and Ground)": "Spices & Condiments",
  "Dried Thyme (Whole and Ground)": "Spices & Condiments",
  "Edible Casein Products": "Dairy - Yogurt & Butter",
  "Edible Safflower Seed Oil": "Edible Oils & Ghee",
  "Edible Sesame Seed Oil": "Edible Oils & Ghee",
  "Edible fats and oils": "Edible Oils & Ghee",
  "Elderberry": "Processed Fruit & Sauces",
  "Energy Drink": "Carbonated Beverages & Juices",
  "Fat spreads and blended spreads": "Edible Oils & Ghee",
  "Fermented Milk": "Dairy - Yogurt & Butter",
  "Fish": "Seafood & Fish",
  "Food Grade Salt": "Spices & Condiments",
  "Fresh Fish, Fish Products and Sea Foods": "Seafood & Fish",
  "Fresh farmed mushrooms (common mushrooms (Agaricus bisporous), shiitake mushrooms (Lentinula edodes), and oyster mushrooms (Pleurotus ostreatus))":
    "Canned Vegetables & Pickles",
  "Frozen Dessert / Ice Confections": "Dairy - Yogurt & Butter",
  "Fruit Squashes": "Carbonated Beverages & Juices",
  "Fruit juices": "Carbonated Beverages & Juices",
  "Fruit juices obtained exclusively from berries and other small fruits":
    "Carbonated Beverages & Juices",
  "Fruiting vegetables": "Canned Vegetables & Pickles",
  "Fruits": "Processed Fruit & Sauces",
  "Fully Preserved (Canned or Fermented) Fish and Fish Products": "Seafood & Fish",
  "Grape juice": "Carbonated Beverages & Juices",
  "Hunter Beef (Value Added Meat Product)": "Poultry & Meat Products",
  "Infant Formula": "Infant Formula & Baby Foods",
  "Infant formula, formula for special medical purposes intended for infants and follow-up formula":
    "Infant Formula & Baby Foods",
  "Iodized Food Grade Salt": "Spices & Condiments",
  "Jams, jellies and marmalades": "Processed Fruit & Sauces",
  "Leafy vegetables": "Canned Vegetables & Pickles",
  "Legume vegetables": "Pulses & Lentils",
  "Lemon Juice": "Carbonated Beverages & Juices",
  "Liquid Mango Pulpy Products": "Carbonated Beverages & Juices",
  "Liquid Tea/Coffee Whitener": "Packaged Liquid Milk",
  "Luncheon Halaal Meat": "Poultry & Meat Products",
  "Mango chutney": "Processed Fruit & Sauces",
  "Margarine": "Edible Oils & Ghee",
  "Marine bivalve mollusks": "Seafood & Fish",
  "Meat and fat of poultry": "Poultry & Meat Products",
  "Meat of cattle, pigs and sheep": "Poultry & Meat Products",
  "Milk": "Packaged Liquid Milk",
  "Mixed Fruit Nectars": "Carbonated Beverages & Juices",
  "Mutton and Goat Meat, Curried and Canned": "Poultry & Meat Products",
  "Natural mineral waters": "Bottled Natural Mineral Water",
  "Nectars of Certain Citrus Fruits": "Carbonated Beverages & Juices",
  "Olive Oil (Virgin, Refined and Pomace)": "Edible Oils & Ghee",
  "Packaged Liquid Milk": "Packaged Liquid Milk",
  "Palm Oil Edible Grade": "Edible Oils & Ghee",
  "Pickled cucumbers (cucumber pickles)": "Canned Vegetables & Pickles",
  "Pig, edible offal of": "Poultry & Meat Products",
  "Pink Rock Salt (Food Grade)": "Spices & Condiments",
  "Poultry, edible offal of": "Poultry & Meat Products",
  "Powdered Tea/Coffee Whitener": "Packaged Liquid Milk",
  "Preserved tomatoes": "Processed Fruit & Sauces",
  "Processed Fish and Fish Products": "Seafood & Fish",
  "Pulpy Nectars of Certain Small Fruits": "Carbonated Beverages & Juices",
  "Pulses": "Pulses & Lentils",
  "Refined Coconut Oil": "Edible Oils & Ghee",
  "Refined Cotton Seed Oil": "Edible Oils & Ghee",
  "Refined Low Erucic Acid Rapeseed (Canola) Oil": "Edible Oils & Ghee",
  "Refined Maize (Corn) Oil": "Edible Oils & Ghee",
  "Refined Mustard Oil": "Edible Oils & Ghee",
  "Refined Palm Kernel Olein": "Edible Oils & Ghee",
  "Refined Palm Kernel Stearin (Edible)": "Edible Oils & Ghee",
  "Refined Palm Olein": "Edible Oils & Ghee",
  "Refined Soya Bean Oil": "Edible Oils & Ghee",
  "Refined Sugar": "Honey & Sweeteners",
  "Refined Sunflower Oil": "Edible Oils & Ghee",
  "Rice, polished": "Rice & Basmati Grains",
  "Root and tuber vegetables": "Canned Vegetables & Pickles",
  "Salad Dressing": "Processed Fruit & Sauces",
  "Salt, food grade": "Spices & Condiments",
  "Secondary milk products": "Dairy - Yogurt & Butter",
  "Sharbets or Syrups (ready to drink)": "Carbonated Beverages & Juices",
  "Soft Drink Powder Mixes": "Carbonated Beverages & Juices",
  "Stalk and stem vegetables": "Canned Vegetables & Pickles",
  "Strained Yoghurt (Chakka or Labneh)": "Dairy - Yogurt & Butter",
  "Synthetic Vinegar": "Spices & Condiments",
  "Table olives": "Canned Vegetables & Pickles",
  "Tamarind Concentrate": "Processed Fruit & Sauces",
  "Tomato Juice": "Carbonated Beverages & Juices",
  "Turmeric Whole and Ground": "Spices & Condiments",
  "Wheat": "Wheat Flour & Atta",
};

export function parseStandardVersionAndRole(standardCode: string): {
  version: string;
  referenceRole: ReferenceRole;
} {
  if (/CXS/i.test(standardCode)) {
    return {
      version: "CXS 193",
      referenceRole: ReferenceRole.INTERNATIONAL_FALLBACK,
    };
  }

  const yearMatch = standardCode.match(/\b(19|20)\d{2}\b/);
  return {
    version: yearMatch ? yearMatch[0] : "Current",
    referenceRole: ReferenceRole.PRIMARY_NATIONAL,
  };
}

export function extractProductMatrix(foodCategory: string, contaminantLabel: string): string {
  const qualifierMatch = contaminantLabel.match(
    /\((Virgin Oil|Non-Virgin Oil|Canned Products|Dry Products)\)/i
  );
  if (qualifierMatch) {
    return `${foodCategory} (${qualifierMatch[1]})`;
  }
  return foodCategory;
}

export function deriveBasis(unit: string, notes: string | null): string {
  const cleanUnit = unit.trim().toLowerCase();
  if (cleanUnit === "mg/l" || cleanUnit === "ug/l" || cleanUnit === "µg/l") {
    return "volume";
  }

  const cleanNotes = (notes || "").toLowerCase();
  if (cleanNotes.includes("dry matter") || cleanNotes.includes("dry basis") || cleanNotes.includes("dry product")) {
    return "dry_mass";
  }
  if (cleanNotes.includes("wet weight") || cleanNotes.includes("wet basis") || cleanNotes.includes("fresh")) {
    return "wet_mass";
  }
  if (cleanNotes.includes("ready to drink") || cleanNotes.includes("ready-to-consume") || cleanNotes.includes("as consumed")) {
    return "wet_mass";
  }

  return "mass";
}
