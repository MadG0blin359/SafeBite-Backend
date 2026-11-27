# SafeBite Barcode Coverage, Missing GTINs & Open-Market Strategy

**Document Version:** 2.2.0 (Post-`Product_Variants` GTIN Ingestion, Collision Reassignment & 69-SKU Excel Export)  
**Updated:** November 18, 2026  
**Single-Sheet Excel Export:** [SafeBite_Missing_Barcodes_Commercial_SKUs.xlsx](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/SafeBite_Missing_Barcodes_Commercial_SKUs.xlsx) *(Sheet: `Missing_Barcodes`, all **69** remaining unbarcoded commercial SKUs)*  
**Database Snapshot:** PostgreSQL `products` (**519 active rows** — **302 consumer-facing** / **217 research benchmarks**) | `product_barcodes` (**848 unique GS1-valid barcodes** across **135** `COMMERCIAL_PACKAGED` SKUs — **66.18%** commercial coverage)

---

## 1. Completed Fixes Summary (v2.1.0 → v2.2.0)

All ingestion, validation, collision-reassignment, and regression test passes have been seeded and empirically verified against live PostgreSQL (**30/30 E2E tests passing**, `0` TypeScript/build errors, **848/848 [100.00%]** GS1 Modulo-10 check-digit pass rate):

| Fix / Milestone Applied | v2.1.0 | v2.2.0 | Concrete Result |
|---|---:|---:|---|
| **Ingested Verified `Product_Variants` GTINs** | 87 barcoded (42.65%) | **135 barcoded (66.18%)** | Ingested **86** GS1-validated GTINs (`77` `EAN_13` + `9` National Foods `UPC_A`) across **48** previously unbarcoded `COMMERCIAL_PACKAGED` SKUs (+23.53 pp commercial coverage) from [SafeBite_Postgres_Seed_Workbook_Filled.xlsx](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/prisma/data/products/SafeBite_Postgres_Seed_Workbook_Filled.xlsx) (`Product_Variants` sheet; 100% identical to [SafeBite_Product_Variants_With_Barcodes.csv](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/prisma/data/products/SafeBite_Product_Variants_With_Barcodes.csv)). Cleanly skipped **22** no-GTIN metadata-only rows. |
| **Reassigned 5 Hijacked `MILK-006` Fruita Vitals Collisions** | 767 GTINs | **848 GTINs (+81 net)** | Reassigned 5 broad-matched Nestle Fruita Vitals barcodes from `MILK-006` (*Nestle MilkPak*, `37 → 32` barcodes; primary `8961008218328` intact) to `JU15` (`8961008211206`), `JU31` (`8961008211244`), `JU1` (`8961008212883`), `JU22` (`8961008213880`), and `JU19` (`8961008218991`). |
| **Strict Format Classification & Leading-Zero Preservation** | Mixed labels | **0 format mismatches** | Added `resolveBarcodeFormat()` and text-safe `{ raw: false }` XLSX parsing in [seed-products.ts](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/prisma/seed-products.ts): **`811` `EAN_13`**, **`19` `UPC_A`**, **`17` `EAN_8`**, **`1` `GTIN_14`**; **209** leading-zero GTINs preserved (including `0710535417227` on `TEA-032`). |
| **2-Pass Primary Barcode Selection** | First-seen | **Verified-first primary** | Primary `products.barcode` now prefers non-`review_required_candidate` GTINs first (`JU7`, `JU15`, `JU19`, `JU22`, `JU31`), falling back cleanly when only candidate GTINs exist (`JU26` = `8964000876145`). |
| **E2E Regression Coverage Expansion** | 23/23 passing | **30/30 passing** | Added **7** new regression tests in [test-endpoints.ts](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/scripts/test-endpoints.ts) covering collision reassignments (`JU31`, `JU19`), leading-zero EAN-13 & 12-digit auto-pad (`TEA-032`), new `UPC_A` (`A2`), and multi-variant `EAN_13` (`JM11`, `JU2`). |
| **Regenerated Single-Sheet Missing Barcode Excel Export** | 117-row `.xlsx` | **69-row `.xlsx`** | Regenerated [SafeBite_Missing_Barcodes_Commercial_SKUs.xlsx](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/SafeBite_Missing_Barcodes_Commercial_SKUs.xlsx) directly from live PostgreSQL (**29** `P1` + **40** `P2`; **4** metadata-only + **65** pending lookup; AutoFilter `A1:Q70`; Text-formatted GTIN column). |

*(Retained from v2.1.0: 8 merged exact/spelling-duplicate SKUs, 22 zero-data placeholders purged, `ProductType` & `isConsumerFacing` taxonomy, and clean ASCII brand/product normalization via [product-display.mapping.ts](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/prisma/mappings/product-display.mapping.ts).)*

---

## 2. Current Catalog & Barcode Architecture (519 Active Products)

| `ProductType` | `isConsumerFacing` | Total Products | Barcoded | Unbarcoded | Coverage % | Needs External Barcode? |
|---|---|---:|---:|---:|---:|---|
| **`COMMERCIAL_PACKAGED`** | `true` | **204** | **135** | **69** | **66.18%** | **Yes** — full 69-SKU checklist in Section 4 & Excel workbook |
| **`INFORMAL_WRAPPED`** | `true` | **27** | 0 | **27** | 0.00% | **No** — cottage-industry school candies; wrapper-name search / `pgvector` / OCR |
| **`LOOSE_COMMODITY`** | `true` | **71** | 0 | **71** | 0.00% | **No** — loose teas, floral honeys, pulses, mithai, open street foods; search-only |
| **`RESEARCH_BENCHMARK`** | `false` | **217** | 0 | **217** | 0.00% | **No** — academic benchmarks hidden from consumer API by default |
| **Total Active DB** | — | **519** | **135** | **384** | **26.01%** *(44.70% consumer)* | — |

### Why 135 Commercial SKUs Map to 848 Rows in `product_barcodes`
All **848** rows in `product_barcodes` belong exclusively to those **135** barcoded `COMMERCIAL_PACKAGED` products (avg. **6.28 barcodes per barcoded SKU**), capturing multi-size, multi-flavor, and multi-region packaging GTINs across the 4-tier priority pipeline (e.g., `PS2 Lays` = 41 barcodes, `N2 Knorr` = 37, `MILK-006 Nestle MilkPak` = 32 after reassigning 5 Fruita Vitals collisions, `CHOC-004 Spencer Milo` = 28, `N5 Indomie` = 25, `BBF-S26 Bournvita` = 24, `CS1 Kurkure` = 24, `CS2 Cheetos` = 23).

### Commercial Barcode Coverage by Category (v2.1.0 → v2.2.0)

| Category | Commercial SKUs | Barcoded (v2.1.0) | Barcoded (v2.2.0) | Newly Barcoded | Remaining Unbarcoded | Coverage % | Total GTINs |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Instant Noodles** | 6 | 6 | **6** | 0 | 0 | **100.00%** | 139 |
| **Infant Formula & Baby Foods** | 27 | 23 | **26** | **+3** | 1 | **96.30%** | 196 |
| **Packaged Liquid Milk** | 12 | 9 | **9** | 0 | 3 | **75.00%** | 91 |
| **Packaged Tea & Coffee** | 19 | 12 | **14** | **+2** | 5 | **73.68%** | 107 |
| **Carbonated Beverages & Juices** | 31 | 5 | **21** | **+16** | 10 | **67.74%** | 40 |
| **Canned Vegetables & Pickles** | 9 | 1 | **6** | **+5** | 3 | **66.67%** | 13 |
| **Chocolates & Confectionery** | 3 | 2 | **2** | 0 | 1 | **66.67%** | 30 |
| **Snack Foods & Chips** | 12 | 8 | **8** | 0 | 4 | **66.67%** | 137 |
| **Processed Fruit & Sauces** | 64 | 15 | **36** | **+21** | 28 | **56.25%** | 64 |
| **Commercial Bread & Bakery** | 10 | 4 | **4** | 0 | 6 | **40.00%** | 26 |
| **Honey & Sweeteners** | 11 | 2 | **3** | **+1** | 8 | **27.27%** | 5 |
| **Total Commercial Catalog** | **204** | **87** | **135** | **+48** | **69** | **66.18%** | **848** |

---

## 3. Summary of 48 Newly Barcoded SKUs Added in v2.2.0

- **Processed Fruit & Sauces (+21 SKUs, 32 GTINs):** Mitchell's (`JM1`, `JM7`, `JM11`, `JM15`, `JM22`, `K6`, `MM2`), National (`JM2`, `JM8`, `JM19`, `MM3`, `S8` — 7 `UPC_A`), Salman's (`JM5`, `JM10`, `JM20`, `JM25`, `MM1` — 100% covered), Shezan (`JM6`, `JM27`, `K10`, `S7`). *All 3 Marmalades are now 100% barcoded.*
- **Carbonated Beverages & Juices (+16 SKUs, 32 GTINs):** Fruitavitals (`JU1`, `JU7`, `JU15`, `JU19`, `JU22`, `JU31` — 100% covered, incl. 5 collisions reassigned from `MILK-006`), Fruitien (`JU2`, `JU8`, `JU14`, `JU23`, `JU26`, `JU32`), Haleeb (`JU6`), Shezan (`JU18`, `JU29`, `JU30`).
- **Canned Vegetables & Pickles (+5 SKUs, 11 GTINs):** Mitchell's (`A3`, `A7`), National (`A2` — 2 `UPC_A`), Shangrilla (`A6`), Shezan (`A9`).
- **Infant Formula & Baby Foods (+3 SKUs, 5 GTINs):** Complan (`BBF-S21`), GSK Horlicks (`BBF-S22`, `BBF-S24`) — category now **96.30%** covered (only `BBF-S8` *Meiji 2* left).
- **Packaged Tea & Coffee (+2 SKUs, 3 GTINs):** Alkozay (`TEA-031`), Zaiqa (`TEA-032` — leading-zero EAN-13 `0710535417227`).
- **Honey & Sweeteners (+1 SKU, 1 GTIN):** Hashmi (`2019-SINDH-H10`).

---

## 4. Complete List of All 69 Remaining `COMMERCIAL_PACKAGED` Products Requiring Barcodes

*(Synchronized 1-to-1 with the single-sheet Excel workbook [SafeBite_Missing_Barcodes_Commercial_SKUs.xlsx](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/SafeBite_Missing_Barcodes_Commercial_SKUs.xlsx). Of the 69 SKUs, **4** have pack-variant metadata without a published GTIN [`2014-KPK-H05`, `JU16`, `JU17`, `JU27`] and **65** have no publicly located GTIN yet.)*

### 4.1 Processed Fruit & Sauces — 28 SKUs (9 Jams, 9 Canned Fruits, 4 Ketchups, 4 Sauces, 2 Tomato Pastes; 0 Marmalades left)

| Code | Sub-Type | Brand | Product Name | Current Grade |
|---|---|---|---|---|
| `JM4` | Jam | Fruit Tree | Strawberry Jam | `F` |
| `JM9` | Jam | Fruit Tree | Apple Jam | `F` |
| `JM14` | Jam | Fruit Tree | Mixed Fruit Jam | `F` |
| `JM16` | Jam | Fruit Tree | Pineapple Jam | `F` |
| `JM17` | Jam | National | Pineapple Jam | `F` |
| `JM21` | Jam | Ahmad's | Mango Jam *(EU Cd ML)* | `F` |
| `JM23` | Jam | National | Blackcurrant | `F` |
| `JM24` | Jam | Fruit Tree | Blackcurrant | `F` |
| `JM26` | Jam | Shezan | Banana jam | `F` |
| `C2` | Canned Fruit | Italia | Fruit Cocktail | `F` |
| `C3` | Canned Fruit | Farm Fresh | Fruit Cocktail | `F` |
| `C4` | Canned Fruit | Fruitamins | Fruit Cocktail | `F` |
| `C5` | Canned Fruit | Fine Life | Pineapple | `F` |
| `C6` | Canned Fruit | Mitchell's | Pineapple | `MIN_ELIGIBLE_NOT_MET` |
| `C8` | Canned Fruit | California | Pineapple | `F` |
| `C9` | Canned Fruit | Pollac | Pineapple | `F` |
| `C10` | Canned Fruit | Italia | Strawberry | `F` |
| `C12` | Canned Fruit | California | Pear halves | `F` |
| `K3` | Ketchup | Kinza | Tomato Ketchup *(EU Cd ML)* | `F` |
| `K4` | Ketchup | Bake Parlor | Tomato Ketchup *(merged `K9`)* | `MIN_ELIGIBLE_NOT_MET` |
| `K5` | Ketchup | Saucy | Tomato Ketchup | `MIN_ELIGIBLE_NOT_MET` |
| `K8` | Ketchup | Best Foods | Tomato Ketchup | `F` |
| `S4` | Sauce | Saucy | Chilli garlic sauce | `F` |
| `S5` | Sauce | Kinza | Chilli garlic sauce | `F` |
| `S10` | Sauce | Shangrilla | Khatti methi imli | `MIN_ELIGIBLE_NOT_MET` |
| `S11` | Sauce | Kinza | Khatti methi imli | `F` |
| `TP1` | Tomato Paste | Lui | Tomato Paste *(EU Cd ML)* | `F` |
| `TP3` | Tomato Paste | White Pearl | Tomato Paste | `F` |

### 4.2 Carbonated Beverages & Juices — 10 SKUs *(Down from 26!)*

| Code | Brand | Product Name | Current Grade | Research Status |
|---|---|---|---|---|
| `JU4` | Slice | Mango Juice | `MIN_ELIGIBLE_NOT_MET` | Pending Lookup |
| `JU11` | Shezan | Apple Juice | `F` | Pending Lookup |
| `JU13` | Haleeb | Apple Juice | `MIN_ELIGIBLE_NOT_MET` | Pending Lookup |
| `JU16` | Tops | Guava Juice (Pouch) | `F` | Variant Metadata Only (1 pack variant, no public GTIN) |
| `JU17` | Tops | Guava Juice | `F` | Variant Metadata Only (2 pack variants, no public GTIN) |
| `JU20` | Fruitien | Red Grapes Juice | `MIN_ELIGIBLE_NOT_MET` | Pending Lookup |
| `JU21` | Tops | Red Grapes Juice | `F` | Pending Lookup |
| `JU25` | Fruitien | Pineapple Juice | `MIN_ELIGIBLE_NOT_MET` | Pending Lookup |
| `JU27` | Tops | Lychee Juice | `F` | Variant Metadata Only (1 pack variant, no public GTIN) |
| `JU34` | Shezan | Orange Juice | `MIN_ELIGIBLE_NOT_MET` | Pending Lookup |

### 4.3 Honey & Sweeteners — 8 SKUs *(Down from 9; Hashmi Honey barcoded)*

| Code | Brand | Product Name | Current Grade | Research Status |
|---|---|---|---|---|
| `2014-KPK-H02` | Qarshi | Qarshi Honey | `A` | Pending Lookup |
| `2014-KPK-H03` | Versatile | Versatile Honey | `A` | Pending Lookup |
| `2014-KPK-H04` | Al-Hayat | Al-Hayat Honey | `A` | Pending Lookup |
| `2014-KPK-H05` | Young's | Young's Honey *(merged `2019-SINDH-H11`)* | `A` | Variant Metadata Only (10 pack variants, no public GTIN) |
| `2014-KPK-H06` | Pak-Salman | Pak-Salman Honey | `A` | Pending Lookup |
| `2019-SINDH-H13` | Islamic | Islamic honey 1 (open garden) | `A` | Pending Lookup |
| `2019-SINDH-H14` | Islamic | Islamic honey 2 (mountain areas) | `A` | Pending Lookup |
| `2019-SINDH-H15` | Islamic | Islamic honey (mixed with royal jelly) | `A` | Pending Lookup |

### 4.4 Commercial Bread & Bakery — 6 SKUs *(All 6 Grade A)*

| Code | Brand | Product Name | Current Grade |
|---|---|---|---|
| `B2` | Dona | Bread | `A` |
| `B3` | 5-Star | Bread | `A` |
| `B6` | Mary Gold | Bread | `A` |
| `B7` | Ravi | Bread | `A` |
| `B8` | R.C.P. | Bread | `A` |
| `B9` | Shezan | Bread | `A` |

### 4.5 Packaged Tea & Coffee — 5 SKUs *(Down from 7; Alkozay & Zaiqa barcoded — all 5 Grade A)*

| Code | Brand | Product Name | Current Grade |
|---|---|---|---|
| `TEA-015` | Tetley | Tetley Tea Bag | `A` |
| `TEA-017` | Safari Tea | Safari Tea | `A` |
| `TEA-030` | Hilltop | Black Tea | `A` |
| `TEA-033` | Lali | Black Tea | `A` |
| `TEA-034` | Shaheen | Shaheen | `A` |

### 4.6 Snack Foods & Chips — 4 SKUs *(All 4 Graded)*

| Code | Brand | Product Name | Current Grade |
|---|---|---|---|
| `PS5` | Kurlees | Potato Snack | `C` |
| `PS6` | Oye Hoye | Potato Snack | `F` |
| `PS7` | Wavy | Potato Snack | `F` |
| `PS9` | Kolson | Potato Snack | `F` |

### 4.7 Canned Vegetables & Pickles (Commercial Achar) — 3 SKUs *(Down from 8!)*

| Code | Brand | Product Name | Current Grade |
|---|---|---|---|
| `A4` | Mitchell's | Lime and chilli | `F` |
| `A5` | Ahmad's | Mixed Achar | `F` |
| `A8` | National | Chilli achar | `MIN_ELIGIBLE_NOT_MET` |

### 4.8 Packaged Liquid Milk — 3 SKUs

| Code | Brand | Product Name | Current Grade |
|---|---|---|---|
| `MILK-004` | Engro Foods | Tarang Tea Whitener | `MIN_ELIGIBLE_NOT_MET` |
| `MILK-010` | Chaika | Chaika | `MIN_ELIGIBLE_NOT_MET` |
| `MILK-012` | Qudrat | Qudrat Milk | `MIN_ELIGIBLE_NOT_MET` |

### 4.9 Infant Formula & Baby Foods — 1 SKU *(Down from 4; 96.30% covered!)*

| Code | Brand | Product Name | Current Grade |
|---|---|---|---|
| `BBF-S8` | Meiji | Meiji 2 | `A` |

### 4.10 Chocolates & Confectionery — 1 SKU

| Code | Brand | Product Name | Current Grade |
|---|---|---|---|
| `CHOC-003` | Candyland | Candyland Paradise Coconut Filled Chocolate | `F` |

---

## 5. Non-Barcoded Consumer Products: Individual-Item Strategy (98 Products)

1. **27 `INFORMAL_WRAPPED` School-Zone Candies (`CHOC-001`..`CHOC-030` excl. `003`, `004`, `029`):** Individually wrapped Rs. 5–20 cottage-industry candies (*Doraemon Chocolates*, *Boom Boom Afridi Chocolate*, *GOFY Chocup*, *City Boy Chocolate Balls*, etc.) — all **27** are **Grade F** and queryable via `GET /api/products?productType=INFORMAL_WRAPPED`. Surface via wrapper-name search, `pgvector` semantic search, and Phase 5 OCR/photo scan fallback.
2. **71 `LOOSE_COMMODITY` Consumer Staples & Open-Market Items:** 15 floral honeys (100% Grade A), 13 pulses & lentils (100% Grade F), 11 loose teas (100% graded), 10 traditional mithai, 7 edible oils, 4 wheat flours, 3 condiments/salts, 3 open fruit sauces, 2 pickles, 2 beverages, 1 rice. Surface as individual searchable commodity/origin profiles (`isScannable: false`).

---

## 6. Remaining Issues, Fixes & Strategic Suggestions

### Remaining Issue 1: 69 Commercial Packaged SKUs Still Need Physical Retail GTINs (33.82% of Commercial Catalog)
- **Fix / Suggestion:** Filter [SafeBite_Missing_Barcodes_Commercial_SKUs.xlsx](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/SafeBite_Missing_Barcodes_Commercial_SKUs.xlsx) by `Lookup_Priority = P1 - High Volume Brand` (**29 SKUs** — covering *Fruit Tree*, *Tops*, *Shezan*, *National*, *Mitchell's*, *Fruitien*, *Qarshi*, *Young's*, *Engro*, *Haleeb*, *Meiji*, *Tetley*, *Candyland*, *Kolson*, *Wavy*) and prioritize physical shelf photography / Pakistani grocery retailer SKU scraping for the 4 metadata-only SKUs (`2014-KPK-H05`, `JU16`, `JU17`, `JU27`) plus an in-app *"Scan & Contribute Missing Barcode"* admin-verified queue.

### Remaining Issue 2: Multi-SKU Barcode Noise in Legacy OFF Matches
- **Status & Suggestion:** Reassigning the 5 Nestle Fruita Vitals collisions from `MILK-006` (`37 → 32` barcodes) proved the value of auditing legacy Tier-1 `Detailed_Matched_Barcodes`. Next pass: add `countryPrefix` / `matchConfidence` metadata to `ProductBarcode` (`896` = GS1 Pakistan) and audit remaining legacy OFF rows (e.g., `EAN_8` foreign pack codes like `02841199`) to prune any non-Pakistan or broad parent-brand noise.

### Remaining Issue 3: Packaging-Variant SKUs (`JU16`/`JU17` Tops Guava & `JU29`/`JU30` Shezan Fruit Punch)
- **Status:** `JU29` (*Shezan Fruit Punch*, `5078643001024`) and `JU30` (*Shezan Fruit Punch (250ml)*, `8964000184974`) are now both independently barcoded in v2.2.0! Keep `JU16` (*Tops Guava Juice (Pouch)*) and `JU17` (*Tops Guava Juice*) separated as distinct packaging-variant SKUs until their physical shelf GTINs are captured.
