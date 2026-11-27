# SafeBite Regulatory Standards Gap & NO_LIMIT Products Roadmap (v2.3.0)

**Document Version:** 2.0.0  
**Updated On:** 2026-11-19T10:24:17.617Z  
**Target Audience:** Engineering, Food Safety Regulatory Researchers, LLM Prompters (ChatGPT / Claude)  
**Associated Files:**
- **Excel Master Workbook:** [SafeBite_NO_LIMIT_Products_For_Standards_Lookup.xlsx](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/SafeBite_NO_LIMIT_Products_For_Standards_Lookup.xlsx)
- **Claude / ChatGPT Lookup CSV Template:** [SafeBite_Claude_Standards_Lookup_Template.csv](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/SafeBite_Claude_Standards_Lookup_Template.csv)
- **Gaps Summary CSV:** [SafeBite_NO_LIMIT_Gaps_Summary.csv](file:///d:/Desktop%20Folders/Run%20Codes/SafeBite-Backend/SafeBite_NO_LIMIT_Gaps_Summary.csv)

---

## 1. Executive Summary & Regulatory Baseline (Post-Ingestion v2.3.0)

In SafeBite's evidence-based food safety engine, when peer-reviewed scientific literature tests a commercial product for a heavy metal or trace mineral (Lead, Cadmium, Chromium, Cobalt, or Copper), the engine resolves statutory maximum limits from the `reference_standards` database across a strict 3-tier hierarchy:
1. **Tier 1 (National Statutory):** Pakistan Standards and Quality Control Authority (`PSQCA`)
2. **Tier 2 (International Fallback):** Codex Alimentarius Commission (`CODEX` - CXS 193-1995)
3. **Tier 3 (Regional / Advisory Fallback):** European Commission Regulation (`EU` 2023/915)

### Resolved Gaps in Current Pass:
- **Rice Lead (`LEAD` in `Rice & Basmati Grains`):** Successfully ingested Codex CXS 193 ($0.20\text{ mg/kg}$) & EU 2023/915 ($0.20\text{ mg/kg}$). Product `STP-15` is now graded on 2 eligible metals ($k=2$).
- **Bread Cadmium (`CADMIUM` in `Commercial Bread & Bakery`):** Ingested the statutory grain ceiling of $0.20\text{ mg/kg}$ (Codex CXS 193 & EU 2023/915). All 10 commercial bread SKUs (`B1` through `B10`) now have Cadmium scored, elevating eligible metals from $k=2$ to $k=3$.

### Core Metrics Summary

| Metric Dimension | Before Ingestion | Current (v2.3.0) | Operational Delta |
| :--- | :---: | :---: | :--- |
| **Total Active Products** | 519 | **519** | Zero catalog drift |
| **Active Reference Standards** | 192 | **196** | **+4 statutory standards ingested** |
| **Products with $\ge 1$ `NO_LIMIT` Metal** | 378 | **368** | **-10 products (10 breads fully resolved)** |
| **Ungraded Products Blocked by `NO_LIMIT`** | 100 | **100** | Pending Cr, Co, Cu standards retrieval |
| **Total Product-Metal Measurement Rows** | 632 | **621** | **-11 unmonitored measurement gaps resolved** |
| **Distinct Regulatory Gaps** | 34 | **32** | **-2 gaps fully closed** |

---

## 2. The 32 Remaining Regulatory Standards Gaps (Prioritized Action Matrix)

The table below catalogs the **32 remaining gaps** in descending order of affected products. Resolving the top gaps (Pickles, Carbonated Beverages, Milk, Rusks) will unlock the 100 blocked products.

| Rank | Category Name | Missing Metal | Affected Products | Blocked Ungraded | Total Lab Obs | Typical Lab Range | Units & Basis | Recommended Authority & Search Focus |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | **Carbonated Beverages & Juices** | `CHROMIUM` | **57** | **26** | 58 | 0.001 - 34.96 (avg 2.0753) | `mg/L, mg/kg` (volume, mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 2 | **Packaged Tea & Coffee** | `COBALT` | **49** | **4** | 49 | 0.067 - 1.564 (avg 0.3778) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Cobalt is rarely statutory in Codex; check EU EFSA / US ATSDR guidance or Russian SanPiN 2.3.2.1078-01 (often 0.5 - 1.0 mg/kg). |
| 3 | **Canned Vegetables & Pickles** | `COBALT` | **44** | **35** | 44 | 1.14 - 21.48 (avg 4.0748) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Cobalt is rarely statutory in Codex; check EU EFSA / US ATSDR guidance or Russian SanPiN 2.3.2.1078-01 (often 0.5 - 1.0 mg/kg). |
| 4 | **Canned Vegetables & Pickles** | `CHROMIUM` | **41** | **36** | 41 | 1.474 - 19.64 (avg 6.3239) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 5 | **Processed Fruit & Sauces** | `CHROMIUM` | **41** | **3** | 41 | 0.141 - 15.07 (avg 3.1388) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 6 | **Packaged Tea & Coffee** | `CHROMIUM` | **40** | **0** | 40 | 0.018 - 10 (avg 2.537) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 7 | **Carbonated Beverages & Juices** | `COBALT` | **34** | **21** | 35 | 0.024 - 15.28 (avg 2.4833) | `mg/L, mg/kg` (volume, mass) | PSQCA / Codex CXS 193 / EU 2023/915: Cobalt is rarely statutory in Codex; check EU EFSA / US ATSDR guidance or Russian SanPiN 2.3.2.1078-01 (often 0.5 - 1.0 mg/kg). |
| 8 | **Packaged Tea & Coffee** | `COPPER` | **30** | **4** | 30 | 0.48 - 12.3 (avg 4.8737) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Check PSQCA standards (PS 516, PS 383, PS 5344), Codex Alimentarius commodity standards, or FSSAI limits (often 5.0 to 15.0 mg/kg). |
| 9 | **Chocolates & Confectionery** | `CHROMIUM` | **29** | **0** | 29 | 0.005 - 0.28 (avg 0.0368) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 10 | **Processed Fruit & Sauces** | `COBALT` | **28** | **7** | 29 | 0.032 - 48.42 (avg 5.2653) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Cobalt is rarely statutory in Codex; check EU EFSA / US ATSDR guidance or Russian SanPiN 2.3.2.1078-01 (often 0.5 - 1.0 mg/kg). |
| 11 | **Honey & Sweeteners** | `COBALT` | **26** | **0** | 29 | 0.00013 - 0.23 (avg 0.0311) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Cobalt is rarely statutory in Codex; check EU EFSA / US ATSDR guidance or Russian SanPiN 2.3.2.1078-01 (often 0.5 - 1.0 mg/kg). |
| 12 | **Honey & Sweeteners** | `CADMIUM` | **26** | **0** | 29 | 0.00011 - 0.38 (avg 0.0416) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Check Codex CXS 193 (0.1 - 0.2 mg/kg for cereal grains/bakery) or EU 2023/915 Section 3.2. |
| 13 | **Packaged Liquid Milk** | `COPPER` | **20** | **5** | 20 | 0.1037 - 0.5717 (avg 0.3121) | `mg/kg, mg/L` (mass, volume) | PSQCA / Codex CXS 193 / EU 2023/915: Check PSQCA standards (PS 516, PS 383, PS 5344), Codex Alimentarius commodity standards, or FSSAI limits (often 5.0 to 15.0 mg/kg). |
| 14 | **Spices & Condiments** | `COBALT` | **16** | **0** | 16 | 0.05 - 1.529 (avg 0.1911) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Cobalt is rarely statutory in Codex; check EU EFSA / US ATSDR guidance or Russian SanPiN 2.3.2.1078-01 (often 0.5 - 1.0 mg/kg). |
| 15 | **Pulses & Lentils** | `COBALT` | **13** | **0** | 13 | 0.62 - 0.71 (avg 0.6554) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Cobalt is rarely statutory in Codex; check EU EFSA / US ATSDR guidance or Russian SanPiN 2.3.2.1078-01 (often 0.5 - 1.0 mg/kg). |
| 16 | **Pulses & Lentils** | `COPPER` | **13** | **0** | 13 | 9 - 20 (avg 12.7308) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Check PSQCA standards (PS 516, PS 383, PS 5344), Codex Alimentarius commodity standards, or FSSAI limits (often 5.0 to 15.0 mg/kg). |
| 17 | **Pulses & Lentils** | `CHROMIUM` | **13** | **0** | 13 | 4.2 - 6.5 (avg 5.5692) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 18 | **Biscuits & Cookies** | `COPPER` | **12** | **12** | 12 | 1 - 3 (avg 2.3092) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Check PSQCA standards (PS 516, PS 383, PS 5344), Codex Alimentarius commodity standards, or FSSAI limits (often 5.0 to 15.0 mg/kg). |
| 19 | **Snack Foods & Chips** | `COPPER` | **12** | **0** | 12 | 0.008 - 0.1075 (avg 0.0525) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Check PSQCA standards (PS 516, PS 383, PS 5344), Codex Alimentarius commodity standards, or FSSAI limits (often 5.0 to 15.0 mg/kg). |
| 20 | **Snack Foods & Chips** | `CHROMIUM` | **12** | **0** | 12 | 2.17929 - 2.328 (avg 2.23) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 21 | **Canned Vegetables & Pickles** | `COPPER` | **10** | **2** | 10 | 0.004 - 6.499 (avg 2.6429) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Check PSQCA standards (PS 516, PS 383, PS 5344), Codex Alimentarius commodity standards, or FSSAI limits (often 5.0 to 15.0 mg/kg). |
| 22 | **Packaged Liquid Milk** | `CHROMIUM` | **10** | **10** | 10 | 0.0385 - 2.103 (avg 0.2915) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 23 | **Instant Noodles** | `COBALT` | **6** | **0** | 6 | 0.39 - 0.74 (avg 0.5483) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Cobalt is rarely statutory in Codex; check EU EFSA / US ATSDR guidance or Russian SanPiN 2.3.2.1078-01 (often 0.5 - 1.0 mg/kg). |
| 24 | **Instant Noodles** | `CHROMIUM` | **6** | **0** | 6 | 3.3 - 9.7 (avg 6.0167) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 25 | **Rice & Basmati Grains** | `COBALT` | **6** | **0** | 6 | 0.623 - 10.87 (avg 4.5038) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Cobalt is rarely statutory in Codex; check EU EFSA / US ATSDR guidance or Russian SanPiN 2.3.2.1078-01 (often 0.5 - 1.0 mg/kg). |
| 26 | **Rice & Basmati Grains** | `COPPER` | **6** | **0** | 6 | 1.17 - 11.5 (avg 3.0117) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Check PSQCA standards (PS 516, PS 383, PS 5344), Codex Alimentarius commodity standards, or FSSAI limits (often 5.0 to 15.0 mg/kg). |
| 27 | **Wheat Flour & Atta** | `COBALT` | **3** | **0** | 3 | 0.62 - 0.658 (avg 0.6427) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Cobalt is rarely statutory in Codex; check EU EFSA / US ATSDR guidance or Russian SanPiN 2.3.2.1078-01 (often 0.5 - 1.0 mg/kg). |
| 28 | **Wheat Flour & Atta** | `COPPER` | **3** | **0** | 3 | 11.5 - 21.6 (avg 16.5333) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Check PSQCA standards (PS 516, PS 383, PS 5344), Codex Alimentarius commodity standards, or FSSAI limits (often 5.0 to 15.0 mg/kg). |
| 29 | **Wheat Flour & Atta** | `CHROMIUM` | **3** | **0** | 3 | 5.5 - 7.8 (avg 6.7667) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 30 | **Infant Formula & Baby Foods** | `COPPER` | **1** | **1** | 1 | 1.9 - 1.9 (avg 1.9) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Check PSQCA standards (PS 516, PS 383, PS 5344), Codex Alimentarius commodity standards, or FSSAI limits (often 5.0 to 15.0 mg/kg). |
| 31 | **Rice & Basmati Grains** | `CHROMIUM` | **1** | **0** | 1 | 7.3 - 7.3 (avg 7.3) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |
| 32 | **Spices & Condiments** | `CHROMIUM` | **1** | **1** | 1 | 0.78 - 0.78 (avg 0.78) | `mg/kg` (mass) | PSQCA / Codex CXS 193 / EU 2023/915: Search Codex CXS 193 or EU 2023/915 total Cr or Cr(VI); WHO Guidelines for Drinking Water (0.05 mg/L); or Indian FSSAI. |

---

## 3. Top Urgent Categories Pending ChatGPT / Gazette Data

### 3.1 Canned Vegetables & Pickles (36 Blocked Products)
- **Affected SKUs:** 36 benchmark and commercial pickle/vegetable products (`SND-*` series).
- **Tested Contaminants:** Chromium (41 products) and Cobalt (44 products).
- **Action:** Check **PS 520** (Pickles in Oil/Vinegar) or Codex **CXS 260-2007**.

### 3.2 Carbonated Beverages & Juices (26 Blocked Products)
- **Affected SKUs:** 26 commercial juices and drinks (`JU1`, `JU15`, `JU19`, `FRU-*`).
- **Tested Contaminants:** Chromium (57 products affected) and Cobalt (34 products affected).
- **Action:** Check **PS 1654** (Carbonated Beverages), **PS 516** (Fruit Juices), or Codex **CXS 247-2005**.

### 3.3 Packaged Liquid Milk (12 Blocked Products)
- **Affected SKUs:** 12 packaged milks (Nestle MilkPak, Olpers, Nurpur).
- **Tested Contaminants:** Copper (20 products affected, 12 blocked) and Chromium (10 products affected).
- **Action:** Check **PS 5344-2022** chemical composition and heavy metal tables.

### 3.4 Biscuits & Cookies (12 Blocked Products)
- **Affected SKUs:** 12 Russian rusk benchmark samples (`RSK-01` through `RSK-12`).
- **Tested Contaminants:** Copper (Cu).
- **Action:** Check **PS 383** (Biscuits) or UK/FSSAI bakery limits ($15.0\text{ mg/kg}$).

---

## 4. Master Prompt for ChatGPT Gazette & Standards Retrieval

```markdown
You are a Senior Regulatory Food Safety Officer and Toxicologist. I am building "SafeBite", an evidence-based food safety grading platform that evaluates packaged foods and agricultural commodities in Pakistan against statutory maximum limits (MLs).

I need you to search official regulatory gazettes, statutory regulatory orders (SROs), technical committee publications, and commodity standards to find heavy metal and trace element limits for the specific Pakistani national (PSQCA) and international (Codex Alimentarius) standards listed below.

### PART 1: PSQCA Gazette & National Standards Verification (Pakistan)
1. PS 1654 (Carbonated Beverages / Soft Drinks): Heavy metal table (Copper, Chromium, Lead).
2. PS 5344 (Packaged Liquid Milk / UHT): Chemical composition & heavy metal tolerances (Copper, Chromium).
3. PS 383 (Biscuits & Baked Goods): Limits for Copper (Cu) or Cadmium (Cd).
4. PS 520 (Pickles & Canned Vegetables): Limits for Copper, Chromium, Cobalt.
5. PS 493 (Black Tea / Green Tea): Limits for Copper, Lead, Cadmium.
6. PS 1688 (Infant Formula): Contaminants table (Lead, Cadmium, Copper).
7. PS 1934 (Honey): Purity & heavy metal specifications.

### PART 2: Codex Commodity Standards
1. CXS 247-2005 (Fruit Juices & Nectars): Section 3.4 Contaminants.
2. CXS 260-2007 (Pickled Fruits and Vegetables): Section 3.3 Contaminants.
3. Codex Stan 207-1999 & Dairy Standards: Heavy metal limits for milk.

### Output JSON Format:
[
  {
    "authority": "PSQCA", 
    "standardCode": "PS 516-1997",
    "version": "1997",
    "contaminant": "COPPER",
    "categoryName": "Carbonated Beverages & Juices",
    "productMatrix": "Fruit Juices",
    "limitValue": 5.0,
    "unit": "mg/kg",
    "basis": "mass",
    "referenceRole": "PRIMARY_NATIONAL",
    "clauseOrTable": "Table 2, Clause 4.3",
    "notes": "Mandatory national maximum limit in Pakistan.",
    "sourceUrl": "https://psqca.com.pk"
  }
]
```

---

## 5. Backlog & To-Do Roadmap
1. **Expanding StandardAuthority (Deferred):**
   - Ingest FSSAI standard for Tea Copper ($150\text{ mg/kg}$) once the `StandardAuthority` enum is expanded to include `FSSAI`.
2. **Arsenic & Mercury Evaluation:**
   - Decided: Do NOT add reference standards or product linkages for Arsenic and Mercury at this stage. Research papers 1–38 did not extract lab data for these elements. Retain schema support for future literature ingestion.
