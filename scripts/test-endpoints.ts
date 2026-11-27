import { createApp } from "../src/app.js";
import { Server } from "http";

async function runTests() {
  const app = createApp();
  let server: Server;
  const port = await new Promise<number>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const p = typeof addr === "object" && addr ? addr.port : 3000;
      resolve(p);
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`🚀 Test server listening on ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`, (err as Error).message);
      failed++;
    }
  }

  try {
    // 1. Categories
    let sampleCategoryId = "";
    await test("GET /api/categories returns 21 categories with counts", async () => {
      const res = await fetch(`${baseUrl}/api/categories`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data) || json.data.length !== 21) {
        throw new Error(`Expected 21 categories, got ${json.data?.length}`);
      }
      sampleCategoryId = json.data[0].id;
      if (typeof json.data[0].productCount !== "number" || typeof json.data[0].referenceStandardCount !== "number") {
        throw new Error("Category missing productCount or referenceStandardCount");
      }
    });

    await test("GET /api/categories/:id returns single category", async () => {
      const res = await fetch(`${baseUrl}/api/categories/${sampleCategoryId}`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.id !== sampleCategoryId) {
        throw new Error("Category id mismatch");
      }
    });

    await test("GET /api/categories/:id/products returns paginated products", async () => {
      const res = await fetch(`${baseUrl}/api/categories/${sampleCategoryId}/products?limit=5`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data) || !json.meta) {
        throw new Error("Invalid pagination response format");
      }
    });

    // 2. Products List & Filters
    await test("GET /api/products returns consumer-facing paginated list by default (302)", async () => {
      const res = await fetch(`${baseUrl}/api/products?limit=10`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.length !== 10 || json.meta.total !== 302) {
        throw new Error(`Expected 10 items, 302 consumer-facing total; got ${json.data?.length}, ${json.meta?.total}`);
      }
      if (!json.data.every((p: any) => p.isConsumerFacing === true)) {
        throw new Error("Non-consumer benchmark leaked into default /api/products");
      }
    });

    await test("GET /api/products?includeBenchmarks=true returns all 519 active products", async () => {
      const res = await fetch(`${baseUrl}/api/products?includeBenchmarks=true&limit=10`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.meta.total !== 519) {
        throw new Error(`Expected 519 total with includeBenchmarks=true; got ${json.meta?.total}`);
      }
    });

    await test("GET /api/products?productType=INFORMAL_WRAPPED returns 27 school candies", async () => {
      const res = await fetch(`${baseUrl}/api/products?productType=INFORMAL_WRAPPED&limit=50`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.meta.total !== 27) {
        throw new Error(`Expected 27 INFORMAL_WRAPPED items; got ${json.meta?.total}`);
      }
    });

    await test("GET /api/products?search=Mitchell's searches by brand", async () => {
      const res = await fetch(`${baseUrl}/api/products?search=Mitchell's`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.length === 0) {
        throw new Error("Expected products for Mitchell's");
      }
      if (!json.data.every((p: any) => p.brand.toLowerCase().includes("mitchell") || p.name.toLowerCase().includes("mitchell"))) {
        throw new Error("Unexpected brand in search results");
      }
    });

    await test("GET /api/products?grade=F filters by safety grade F", async () => {
      const res = await fetch(`${baseUrl}/api/products?grade=F&limit=10`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.length === 0) {
        throw new Error("Expected Grade F products");
      }
      if (!json.data.every((p: any) => p.latestAnalysis?.grade === "F")) {
        throw new Error("Non-Grade F product returned");
      }
    });

    await test("GET /api/products?grade=A filters by safety grade A", async () => {
      const res = await fetch(`${baseUrl}/api/products?grade=A&limit=10`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.length === 0) {
        throw new Error("Expected Grade A products");
      }
      if (!json.data.every((p: any) => p.latestAnalysis?.grade === "A")) {
        throw new Error("Non-Grade A product returned");
      }
    });

    // 3. Product Detail (by ID and productCode)
    let sampleProductUuid = "";
    await test("GET /api/products/:id works by productCode (CS3)", async () => {
      const res = await fetch(`${baseUrl}/api/products/CS3`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "CS3") {
        throw new Error("Product code mismatch for CS3");
      }
      sampleProductUuid = json.data.id;
      if (!Array.isArray(json.data.researchMeasurements) || json.data.researchMeasurements.length === 0) {
        throw new Error("Expected research measurements for CS3");
      }
    });

    await test("GET /api/products/:id works by UUID", async () => {
      const res = await fetch(`${baseUrl}/api/products/${sampleProductUuid}`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.id !== sampleProductUuid) {
        throw new Error("Product UUID mismatch");
      }
    });

    // 4. Barcode Lookup (Recovered OFF barcode, Restored UPC-A, Multi-SKU)
    await test("GET /api/products/barcode/:barcode finds recovered OFF barcode (8964000585283)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/8964000585283`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "CS3") {
        throw new Error(`Expected CS3 for barcode 8964000585283, got ${json.data?.productCode}`);
      }
    });

    await test("GET /api/products/barcode/:barcode finds restored UPC-A with leading zero (072830440042)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/072830440042`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "C13") {
        throw new Error(`Expected C13 for restored barcode 072830440042, got ${json.data?.productCode}`);
      }
    });

    await test("GET /api/products/barcode/:barcode auto-pads 11-digit UPC-A (72830440042)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/72830440042`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "C13") {
        throw new Error(`Expected C13 for 11-digit input 72830440042, got ${json.data?.productCode}`);
      }
    });

    await test("GET /api/products/barcode/:barcode finds secondary retail barcode for multi-SKU (089686170726)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/089686170726`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "N5") {
        throw new Error(`Expected N5 for Indomie barcode 089686170726, got ${json.data?.productCode}`);
      }
    });

    await test("GET /api/products/barcode/:barcode resolves reassigned Cerelac barcode (8961008210537 -> BBF-S13)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/8961008210537`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "BBF-S13") {
        throw new Error(`Expected BBF-S13 for Cerelac barcode 8961008210537, got ${json.data?.productCode}`);
      }
    });

    await test("GET /api/products/barcode/:barcode resolves reassigned Fruita Vitals Kinnow barcode (8961008211244 -> JU31)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/8961008211244`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "JU31" || json.data.primaryBarcode !== "8961008211244") {
        throw new Error(
          `Expected JU31 (primary 8961008211244) for barcode 8961008211244, got ${json.data?.productCode} (primary ${json.data?.primaryBarcode})`
        );
      }
    });

    await test("GET /api/products/barcode/:barcode resolves reassigned Fruita Vitals Red Grapes barcode (8961008218991 -> JU19)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/8961008218991`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "JU19" || json.data.primaryBarcode !== "8961008216249") {
        throw new Error(
          `Expected JU19 (primary 8961008216249) for barcode 8961008218991, got ${json.data?.productCode} (primary ${json.data?.primaryBarcode})`
        );
      }
    });

    await test("GET /api/products/barcode/:barcode preserves leading-zero EAN-13 (0710535417227 -> TEA-032)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/0710535417227`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "TEA-032" || json.data.primaryBarcode !== "0710535417227") {
        throw new Error(
          `Expected TEA-032 (primary 0710535417227), got ${json.data?.productCode} (primary ${json.data?.primaryBarcode})`
        );
      }
    });

    await test("GET /api/products/barcode/:barcode auto-pads 12-digit stripped EAN-13 (710535417227 -> TEA-032)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/710535417227`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "TEA-032") {
        throw new Error(`Expected TEA-032 for 12-digit input 710535417227, got ${json.data?.productCode}`);
      }
    });

    await test("GET /api/products/barcode/:barcode finds new National Foods UPC-A (620514015774 -> A2)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/620514015774`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "A2") {
        throw new Error(`Expected A2 for UPC-A 620514015774, got ${json.data?.productCode}`);
      }
    });

    await test("GET /api/products/barcode/:barcode finds multi-variant Mitchell's Mixed Fruit Jam (8961005030046 -> JM11)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/8961005030046`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "JM11" || !Array.isArray(json.data.barcodes) || json.data.barcodes.length !== 3) {
        throw new Error(`Expected JM11 with 3 barcodes, got ${json.data?.productCode} (${json.data?.barcodes?.length})`);
      }
    });

    await test("GET /api/products/barcode/:barcode finds Fruitien Mango Juice 1L (8964000876435 -> JU2)", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/8964000876435`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.productCode !== "JU2") {
        throw new Error(`Expected JU2 for Fruitien barcode 8964000876435, got ${json.data?.productCode}`);
      }
    });

    // 5. Safety Analysis Endpoint
    await test("GET /api/safety/:productId returns deterministic safety report with CLR & interpretation", async () => {
      const res = await fetch(`${baseUrl}/api/safety/S1`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || !json.data.score || !json.data.interpretation) {
        throw new Error("Missing score or interpretation in safety report");
      }
      if (json.data.score.grade !== "F" || json.data.score.overallStatusText !== "Above Limit") {
        throw new Error(`Expected Grade F Above Limit for S1, got ${json.data.score.grade} / ${json.data.score.overallStatusText}`);
      }
    });

    await test("GET /api/safety/TEA-001 grades Lipton Yellow Label (EU Cd fallback unlocked)", async () => {
      const res = await fetch(`${baseUrl}/api/safety/TEA-001`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.score.grade !== "A" || json.data.score.eligibleCount < 2) {
        throw new Error(`Expected Grade A (k>=2) for TEA-001, got ${json.data.score?.grade} (k=${json.data.score?.eligibleCount})`);
      }
    });

    await test("GET /api/safety/N2 grades Knorr Instant Noodles (BELOW_LOD Lead compliant)", async () => {
      const res = await fetch(`${baseUrl}/api/safety/N2`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.score.grade !== "B" || json.data.score.eligibleCount < 2) {
        throw new Error(`Expected Grade B (k>=2) for N2, got ${json.data.score?.grade} (k=${json.data.score?.eligibleCount})`);
      }
    });

    await test("GET /api/safety/S2 flags National Chilli Garlic Sauce Grade F (EU Cd 0.05 mg/kg ML)", async () => {
      const res = await fetch(`${baseUrl}/api/safety/S2`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.score.grade !== "F" || json.data.score.highestContaminant !== "CADMIUM") {
        throw new Error(`Expected Grade F (CADMIUM) for S2, got ${json.data.score?.grade} (${json.data.score?.highestContaminant})`);
      }
    });

    await test("GET /api/products/MILK-006 returns merged & normalized Nestle MilkPak with barcodes", async () => {
      const res = await fetch(`${baseUrl}/api/products/MILK-006`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.name !== "Nestle MilkPak Full Cream Milk" || json.data.barcodes.length < 20) {
        throw new Error(`Unexpected MILK-006 payload: name=${json.data?.name}, barcodes=${json.data?.barcodes?.length}`);
      }
    });

    // 6. Alternatives Recommendation Endpoint (FR-08)
    await test("GET /api/alternatives/:productId returns safer alternatives for category", async () => {
      const res = await fetch(`${baseUrl}/api/alternatives/S1`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data.alternatives)) {
        throw new Error("Invalid alternatives response format");
      }
      console.log(`   ℹ️  Alternatives for S1 (${json.data.status}): found ${json.data.alternatives.length} safer candidates`);
    });

    // 7. 404 Behavior for unknown barcode
    await test("GET /api/products/barcode/9999999999999 returns 404", async () => {
      const res = await fetch(`${baseUrl}/api/products/barcode/9999999999999`);
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

  } finally {
    server!.close();
  }

  console.log(`\n================================`);
  console.log(`Tests Run: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
