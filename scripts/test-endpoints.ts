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
    await test("GET /api/products returns paginated list", async () => {
      const res = await fetch(`${baseUrl}/api/products?limit=10`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      if (!json.success || json.data.length !== 10 || json.meta.total !== 549) {
        throw new Error(`Expected 10 items, 549 total; got ${json.data?.length}, ${json.meta?.total}`);
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
