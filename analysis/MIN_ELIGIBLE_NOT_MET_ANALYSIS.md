# SafeBite `MIN_ELIGIBLE_NOT_MET` Post-Remediation Analysis & Roadmap

**Document Version:** 2.2.0 (Post-`Product_Variants` Barcode Expansion — Updated Barcoded Ungraded Visibility & `MILK-006` Audit)  
**Updated:** November 18, 2026  
**Database Snapshot:** PostgreSQL `analysis_results` (`ruleVersion = "1.0.0"`, **519 active products** — **302 consumer-facing** / **217 research benchmarks** | **192 reference standards** | **848 retail barcodes across 135 commercial SKUs**)

---

## 1. Executive Impact Across Releases (v1.0.0 → v2.2.0)

| Metric | Initial (v1.0.0) | After v2.0.0 | After v2.1.0 | Current (v2.2.0) | Net Status / Delta |
|---|---:|---:|---:|---:|---|
| **Active Regulatory Standards** | 89 *(drifted)* | 191 | 192 | **192** | `179` PSQCA + `7` Codex + `6` EU (`EU 2023/915` Infant Formula & Fruit/Sauces Cd) |
| **Total `MIN_ELIGIBLE_NOT_MET` (All DB)** | 240 | 158 | 150 | **150** | **−90 resolved**; **0 grading drift** during v2.2.0 barcode ingestion |
| **Zero-Data `NO_RESEARCH_RECORD`** | 22 | 0 | 0 | **0** | **100% purged** |
| **Consumer-Facing Graded Rate** | ~57% | 83.3% (255/306) | 85.76% (259/302) | **85.76% (259 / 302)** | Only **43** consumer items ungraded (**36** commercial + **7** loose) |
| **Commercial Packaged Graded Rate** | 49.0% (104/212) | 78.8% (164/208) | 82.35% (168/204) | **82.35% (168 / 204)** | **112 / 135 (82.96%)** of barcoded commercial SKUs are graded |
| **Barcoded `MIN_ELIGIBLE_NOT_MET` SKUs** | — | — | 17 | **23** | **+6 newly scannable ungraded SKUs** (`JU7`, `JU8`, `JU29`, `K6`, `MM2`, `MM3`) |

### Key Highlights Through v2.2.0
- **v2.2.0 Scannable Ungraded Expansion (+6 Barcoded SKUs):** Ingesting **86** verified `Product_Variants` GTINs expanded barcoded commercial coverage from **42.65% → 66.18%** (`87 → 135` SKUs) while keeping all deterministic safety grades strictly invariant (`369` graded / `150` `MIN_ELIGIBLE_NOT_MET`). Six of the 48 newly barcoded SKUs (`JU7`, `JU8`, `JU29`, `K6`, `MM2`, `MM3`) are currently `MIN_ELIGIBLE_NOT_MET`, raising the number of physically scannable retail products that return `Insufficient Data` from **17 → 23** (**17** of which already have `eligibleCount = 1`).
- **Processed Fruit & Sauces High-Cadmium Safety Catch (7 SKUs flagged Grade F in v2.1.0):** Adding EU `2023/915` Cadmium ML (`0.05 mg/kg`) flagged `JM15`, `JM22`, `S2`, `JM5`, `TP1`, `JM21`, and `K3` — and as of v2.2.0, **`JM15`, `JM22`, `S2`, and `JM5` are now physically barcoded and scannable**!
- **Packaged Tea & Coffee (100% of consumer teas graded):** Fixing `StandardAuthority.EU` fallback in [standard-resolver.service.ts](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/src/services/standard-resolver.service.ts#L124-L202) unlocked all **19 commercial + 11 loose consumer teas** (*Lipton Yellow Label*, *Tapal*, *Brooke Bond Supreme*, *Alkozay*, *Zaiqa*, *Tetley* → **Grade A**).
- **Infant Formula & Baby Foods (22 of 27 graded; 26 of 27 barcoded):** Adding EU `2023/915` Cadmium MLs (`0.02 / 0.04 mg/kg`) unlocked **21 baby foods** (**Grade A**), and v2.2.0 barcoded `BBF-S21`, `BBF-S22`, and `BBF-S24`.
- **Instant Noodles, Snacks & Commercial Bread (100% graded):** Fixing `BELOW_LOD` non-detect compliance in [clr.service.ts](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/src/services/clr.service.ts#L161-L265) and [scoring.service.ts](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/src/services/scoring.service.ts#L44-L58) unlocked `N2` (*Knorr*), `N3` (*Shan Shoop*), `N4` (*Shin Ramyun*) → **Grade B**, plus `PS3`, `CS3`, `PS5` (**Grade C**), `PS6`, and `B3` (**Grade A**).

---

## 2. Post-v2.2.0 Breakdown of Remaining 150 `MIN_ELIGIBLE_NOT_MET` Products

Out of **150** remaining records across the entire database, **107 (71.33%) are hidden `RESEARCH_BENCHMARK` rows** (`isConsumerFacing = false`), and only **43 (28.67%) are consumer-facing** (**36** `COMMERCIAL_PACKAGED` + **7** `LOOSE_COMMODITY`), of which **23** are physically barcoded:

### 2.1 Breakdown by Root Cause Bucket

| Root Cause Bucket | Total Remaining | Consumer-Facing (`isConsumerFacing=true`) | Hidden Benchmarks (`isConsumerFacing=false`) | Barcoded SKUs | Explanation |
|---|---:|---:|---:|---:|---|
| **Unregulated Metals Only (`UNREGULATED_METALS_ONLY`, `elig=0`)** | **58** | **12** *(11 comm + 1 loose)* | **46** | **6** *(+3 in v2.2.0: `JU7`, `K6`, `MM2`)* | Source study tested only `Cr`/`Co`/`Cu` in categories with no PSQCA/Codex/EU ML |
| **Single Eligible Metal (`SINGLE_ELIGIBLE_METAL`, `elig=1`)** | **47** | **26** *(25 comm + 1 loose)* | **21** | **17** *(+3 in v2.2.0: `JU8`, `JU29`, `MM3`)* | Valid CLR computed for 1 metal (`Cd`, `Cu`, or `Pb`), but second metal not measured, unregulated, or `RANGE_VALUE` |
| **Category-Level Evidence Only (`CATEGORY_LEVEL_ONLY`)** | **45** | **5** *(0 comm + 5 loose)* | **40** | **0** | `evidenceLevel = CATEGORY_LEVEL` strictly excluded from product grading by `FR-03-07` |
| **Total Remaining** | **150** | **43** | **107** | **23** | — |

### 2.2 Breakdown by Category

| Category | Total `MIN_ELIGIBLE` | Consumer (`36` Comm + `7` Loose) | Hidden Benchmarks | Barcoded (v2.2.0) | Primary Remaining Blocker |
|---|---:|---:|---:|---:|---|
| **Packaged Liquid Milk** | 12 | **12** (12 Comm) | 0 | **9** | Source UHT/whitener study never measured `LEAD` (`0/12`); 8 have `Cd` only (`k=1`), 4 have only `Cr`/`Cu` (`MILK-006` cleaned `37 → 32` barcodes in v2.2.0) |
| **Carbonated Beverages & Juices** | 29 | **10** (10 Comm) | 19 | **5** *(was 2)* | 9 commercial juices tested `Cu` + `Cr`/`Co` without `Pb`/`Cd` (`k=1`); `JU7` tested only `Cr`; **newly barcoded:** `JU7` (3), `JU8` (2), `JU29` (1) |
| **Processed Fruit & Sauces** | 8 | **8** (8 Comm) | 0 | **4** *(was 1)* | Remaining 8 tested neither `LEAD` nor `CADMIUM` (only `Co`, `Cr`, or `Cu`); **newly barcoded:** `K6` (2), `MM2` (1), `MM3` (1) |
| **Infant Formula & Baby Foods** | 5 | **5** (5 Comm) | 0 | **5** | Only `BBF-S1..S5` left — all 5 have valid `Pb` (`k=1`), while `Cd` (`0.07 mg/kg`) and `Cu` (`1.9 mg/kg`) are `RANGE_VALUE` intervals |
| **Edible Oils & Ghee** | 5 | **4** (4 Loose) | 1 | **0** | Generic unbranded oils (`SAO-01/02/03/05`) have `CATEGORY_LEVEL` evidence (`NOT_PRODUCT_SPECIFIC`) |
| **Canned Vegetables & Pickles** | 46 | **2** (1 Comm + 1 Loose) | 44 | **0** | `A8` (*National Chilli Achar*) has `Pb` only (`k=1`); `A11` (*Open Chilli Achar*) has `Cr/Co/Cu`; 44 are hidden `SND-*`/`VEG-*` benchmarks |
| **Spices & Condiments** | 2 | **2** (2 Loose) | 0 | **0** | `SLT-01` (*Refined table salt*) is `CATEGORY_LEVEL`; `SPC-01` (*Turmeric*) has `Pb` only (`k=1`) |
| **Poultry & Meat Products** | 25 | **0** | 25 | **0** | 100% hidden `RESEARCH_BENCHMARK` (`CATEGORY_LEVEL` raw meat/organs) |
| **Biscuits & Cookies** | 13 | **0** | 13 | **0** | 100% hidden `RESEARCH_BENCHMARK` (`12 RSK-*` rusks tested Copper only + `1 CNF-01` pooled) |
| **Packaged Tea & Coffee** | 4 | **0** | 4 | **0** | **0 consumer teas left!** Only 4 hidden blinded `TEA2`/`TEA3` benchmarks |
| **Rice & Basmati Grains** | 1 | **0** | 1 | **0** | Hidden `RCE-01` pooled benchmark (`CATEGORY_LEVEL`) |
| **Total** | **150** | **43** | **107** | **23** | — |

---

## 3. Complete List of All 43 Remaining Consumer-Facing `MIN_ELIGIBLE_NOT_MET` Products

### 3.1 Packaged Liquid Milk — 12 Commercial SKUs (9 Barcoded)
| Code | Brand | Product Name | Barcoded | `elig/tested` | Missing / Excluded Metals |
|---|---|---|---|---|---|
| `MILK-001` | Good Milk | Good Milk | **Yes** | `1/2` | `Cd` eligible (`k=1`); `Pb` not tested; `Cr` `NO_LIMIT` |
| `MILK-002` | Engro Foods | Olper's Full Cream Milk | **Yes** | `1/2` | `Cd` eligible (`k=1`); `Pb` not tested; `Cr` `NO_LIMIT` |
| `MILK-003` | Dairy Pure | Dairy Pure | **Yes** | `1/2` | `Cd` eligible (`k=1`); `Pb` not tested; `Cr` `NO_LIMIT` |
| `MILK-004` | Engro Foods | Tarang Tea Whitener | No | `1/2` | `Cd` eligible (`k=1`); `Pb` not tested; `Cr` `NO_LIMIT` |
| `MILK-005` | Haleeb | Haleeb | **Yes** | `1/2` | `Cd` eligible (`k=1`); `Pb` not tested; `Cr` `NO_LIMIT` |
| `MILK-006` | Nestle | Nestle MilkPak Full Cream Milk *(merged `MILK-008`)* | **Yes** (32) | `1/3` | `Cd` eligible (`k=1`); `Pb` not tested; `Cr`/`Cu` `NO_LIMIT` *(5 Fruita Vitals collisions reassigned in v2.2.0)* |
| `MILK-007` | Engro Foods | Dairy Omung | **Yes** | `1/2` | `Cd` eligible (`k=1`); `Pb` not tested; `Cr` `NO_LIMIT` |
| `MILK-009` | Dairy Queen | Dairy Queen | **Yes** | `0/2` | Only `Cr`/`Cu` tested (`NO_LIMIT`) |
| `MILK-010` | Chaika | Chaika | No | `0/1` | Only `Cu` tested (`NO_LIMIT`) |
| `MILK-011` | Nestle | Nestle Everyday | **Yes** | `0/2` | Only `Cr`/`Cu` tested (`NO_LIMIT`) |
| `MILK-012` | Qudrat | Qudrat Milk | No | `0/1` | Only `Cu` tested (`NO_LIMIT`) |
| `MILK-013` | Nestle | Nestle Nesvita | **Yes** | `1/2` | `Cd` eligible (`k=1`); `Pb` not tested; `Cr` `NO_LIMIT` |

### 3.2 Carbonated Beverages & Juices — 10 Commercial SKUs (5 Barcoded — +3 in v2.2.0)
| Code | Brand | Product Name | Barcoded | `elig/tested` | Missing / Excluded Metals |
|---|---|---|---|---|---|
| `JU3` | Nesfruta | Mango Juice | **Yes** | `1/2` | `Cu` eligible (`k=1`); `Pb/Cd` not tested; `Cr` `NO_LIMIT` |
| `JU4` | Slice | Mango Juice | No | `1/2` | `Cu` eligible (`k=1`); `Pb/Cd` not tested; `Cr` `NO_LIMIT` |
| `JU7` | Fruitavitals | Apple Juice | **Yes (3, v2.2.0)** | `0/1` | Only `Cr` tested (`NO_LIMIT`) |
| `JU8` | Fruitien | Apple Juice | **Yes (2, v2.2.0)** | `1/2` | `Cu` eligible (`k=1`); `Pb/Cd` not tested; `Cr` `NO_LIMIT` |
| `JU13` | Haleeb | Apple Juice | No | `1/3` | `Cu` eligible (`k=1`); `Pb/Cd` not tested; `Cr/Co` `NO_LIMIT` |
| `JU20` | Fruitien | Red Grapes Juice | No | `1/2` | `Cu` eligible (`k=1`); `Pb/Cd` not tested; `Cr` `NO_LIMIT` |
| `JU24` | Rani | Rani Float Peach Juice | **Yes** | `1/2` | `Cu` eligible (`k=1`); `Pb/Cd` not tested; `Co` `NO_LIMIT` |
| `JU25` | Fruitien | Pineapple Juice | No | `1/2` | `Cu` eligible (`k=1`); `Pb/Cd` not tested; `Cr` `NO_LIMIT` |
| `JU29` | Shezan | Fruit Punch | **Yes (1, v2.2.0)** | `1/3` | `Cu` eligible (`k=1`); `Pb/Cd` not tested; `Cr/Co` `NO_LIMIT` |
| `JU34` | Shezan | Orange Juice | No | `1/3` | `Cu` eligible (`k=1`); `Pb/Cd` not tested; `Cr/Co` `NO_LIMIT` |

### 3.3 Processed Fruit & Sauces — 8 Commercial SKUs (4 Barcoded — +3 in v2.2.0)
| Code | Brand | Product Name | Barcoded | `elig/tested` | Missing / Excluded Metals |
|---|---|---|---|---|---|
| `C6` | Mitchell's | Pineapple | No | `0/1` | Only `Co` tested (`NO_LIMIT`) |
| `K4` | Bake Parlor | Tomato Ketchup *(merged `K9`)* | No | `0/1` | Only `Co` tested (`NO_LIMIT`) |
| `K5` | Saucy | Tomato Ketchup | No | `1/1` | Only `Cu` tested (`k=1`, non-priority metal) |
| `K6` | Mitchell's | Tomato Ketchup | **Yes (2, v2.2.0)** | `0/1` | Only `Co` tested (`NO_LIMIT`) |
| `MM2` | Mitchell's | Golden Mist | **Yes (1, v2.2.0)** | `0/1` | Only `Co` tested (`NO_LIMIT`) |
| `MM3` | National | Orange Marmalade | **Yes (1, v2.2.0)** | `1/3` | `Cu` eligible (`k=1`); `Pb/Cd` not tested; `Cr/Co` `NO_LIMIT` |
| `S9` | Mitchell's | Khatti methi imli | **Yes** | `0/2` | Only `Cr/Co` tested (`NO_LIMIT`) |
| `S10` | Shangrilla | Khatti methi imli | No | `0/2` | Only `Cr/Co` tested (`NO_LIMIT`) |

### 3.4 Infant Formula & Baby Foods — 5 Commercial SKUs (All 5 Barcoded!)
| Code | Brand | Product Name | Barcoded | `elig/tested` | Blocker |
|---|---|---|---|---|---|
| `BBF-S1` | Nestle | NAN 1 Infant Formula | **Yes** | `1/3` | `Pb` eligible (`k=1`); `Cd=0.07 mg/kg` & `Cu=1.9 mg/kg` stored as `RANGE_VALUE` |
| `BBF-S2` | Nestle | Lactogen 1 | **Yes** | `1/3` | `Pb` eligible (`k=1`); `Cd=0.07 mg/kg` & `Cu=1.9 mg/kg` stored as `RANGE_VALUE` |
| `BBF-S3` | Meiji | Meiji 1 | **Yes** | `1/3` | `Pb` compliant (`BELOW_LOD`, `k=1`); `Cd=0.07 mg/kg` & `Cu=1.9 mg/kg` stored as `RANGE_VALUE` |
| `BBF-S4` | Abbott | Similac | **Yes** | `1/3` | `Pb` eligible (`k=1`); `Cd=0.07 mg/kg` stored as `RANGE_VALUE`, `Cu` `NO_LIMIT` |
| `BBF-S5` | Morinaga | Morinaga 1 Infant Formula | **Yes** | `1/3` | `Pb` eligible (`k=1`); `Cd=0.07 mg/kg` & `Cu=1.9 mg/kg` stored as `RANGE_VALUE` |

### 3.5 Commercial Pickles (1) & Loose Consumer Commodities (7)
- **Commercial (1, Unbarcoded):** `A8` (*National Chilli achar* — `Pb` eligible `k=1`, `Cd` not tested, `Cr/Cu` `NO_LIMIT`).
- **Loose Commodities (7, Unbarcoded):** `A11` (*Open Chilli Achar* — `Cr/Co/Cu` `NO_LIMIT`), `SLT-01` (*Refined table salt* — `CATEGORY_LEVEL`), `SPC-01` (*Turmeric powder* — `Pb` only `k=1`), `SAO-01/02/03/05` (*Corn/Sunflower/Soybean/Sesame oil* — `CATEGORY_LEVEL`).

---

## 4. Remaining Issues, Fixes & Strategic Suggestions

### Remaining Issue 1: 23 Physically Scannable Commercial SKUs Return `MIN_ELIGIBLE_NOT_MET` (Up from 17 in v2.1.0)
- **Problem:** With v2.2.0 adding barcodes to `JU7`, `JU8`, `JU29`, `K6`, `MM2`, and `MM3`, consumers scanning **23** high-visibility Pakistani retail SKUs (*Olper's*, *Nestle MilkPak*, *Haleeb*, *NAN 1*, *Lactogen 1*, *Similac*, *Fruitavitals Apple*, *Fruitien Apple*, *Shezan Fruit Punch*, *Mitchell's Ketchup/Golden Mist*, *National Orange Marmalade*) will currently see `Insufficient Data` — even though **17 of the 23** already have a valid single-metal CLR (`eligibleCount = 1`).
- **Suggested Fix:** Prioritize a **"Partial Safety Evidence"** UI card in the mobile client for all `eligibleCount = 1` products (e.g., *"Cadmium: 0.05 mg/kg — Well below PSQCA limit; Lead not yet tested in ingested studies"*) so barcode scans always deliver transparent scientific value rather than an empty state.

### Remaining Issue 2: Last 5 Barcoded Infant Formulas (`BBF-S1..S5`) Blocked by `RANGE_VALUE`
- **Problem:** `BBF-S1..S5` (*NAN 1*, *Lactogen 1*, *Meiji 1*, *Similac*, *Morinaga 1*) have valid Lead (`k=1`), but their Cadmium value (`0.07 mg/kg` — **3.5× above the EU 0.02 mg/kg infant formula limit**) is recorded as `RANGE_VALUE` (`range_max`) and excluded by `clr.service.ts`.
- **Suggested Fix:** Keep `RANGE_VALUE` excluded from numeric `CCI` averaging for scientific rigor, **AND** either (a) add a `RANGE_EXCEEDANCE_ADVISORY` warning banner in `interpretation.service.ts` whenever a `range_max` breaches a regulatory ML, or (b) ingest a peer-reviewed Pakistani infant-formula study reporting exact `mean ± SD` point measurements for these 5 flagship formulas.

### Remaining Issue 3: 12 Flagship Commercial Milk Brands (`MILK-001..007, 009..013`) Missing Lead Data
- **Problem:** Iconic Pakistani brands (*Olper's*, *Nestle MilkPak*, *Haleeb*, *Dairy Pure*, *Dairy Omung*, *Nestle Nesvita*, *Tarang*, *Nestle Everyday*) had zero Lead measurements in the ingested milk study (8 have Cadmium only, 4 have Cr/Cu only).
- **Suggested Fix:** Add 1–2 published Pakistani UHT/packaged milk AAS/ICP-OES studies measuring both `Pb` and `Cd` into `safebite_clean_data_review4.xlsx` to unlock **all 12 flagship dairy brands** (9 already barcoded).

### Remaining Issue 4: 4 Loose Edible Oils (`SAO-01/02/03/05`) & `SLT-01` Salt Excluded as `CATEGORY_LEVEL`
- **Suggested Fix:** Verify whether `SAO-01..05` and `SLT-01` were discrete market samples mislabeled as `category_level` in `review4.xlsx` (note `SAO-04/06/07` from the same study graded F), or render a distinct **"Category Market Advisory"** card for `LOOSE_COMMODITY` items without violating `FR-03-07`.

### Remaining Issue 5: Preserve the `k >= 2` Scientific Guardrail (`FR-06-06`)
- **Governance Rule:** Do **not** weaken `eligibleCount >= 2` or grade on unregulated metals (`Cr`, `Co`) alone. Keeping the remaining **36** genuinely under-tested commercial items as `Insufficient Data` with transparent Partial Lab Profiles protects SafeBite's scientific credibility and prevents misleading "Grade A" assurances on products never tested for Lead.
