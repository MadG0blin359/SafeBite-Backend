import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const totalProducts = await prisma.product.count();
  const totalBarcodes = await prisma.productBarcode.count();
  const totalResearchData = await prisma.researchData.count();
  const totalSources = await prisma.researchSource.count();
  const totalStandards = await prisma.referenceStandard.count();
  const totalAnalyses = await prisma.analysisResult.count();

  console.log('=== TOTALS ===');
  console.log({ totalProducts, totalBarcodes, totalResearchData, totalSources, totalStandards, totalAnalyses });

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true, standards: true, researchData: true } },
      products: {
        include: {
          barcodes: true,
          analysisResults: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  const catSummary = categories.map(c => {
    const grades: Record<string, number> = {};
    const reasonCodes: Record<string, number> = {};
    let barcodedProducts = 0;
    let solid = 0;
    let liquid = 0;
    let loose = 0;
    let graded = 0;
    let insufficient = 0;

    c.products.forEach(p => {
      if (p.barcodes.length > 0 || p.barcode) barcodedProducts++;
      const mat = (p.matrix || '').toLowerCase();
      if (mat.includes('liquid') || mat.includes('fluid') || mat.includes('beverage') || mat.includes('juice') || mat.includes('milk') || mat.includes('oil')) {
        liquid++;
      } else if (mat.includes('bulk') || mat.includes('loose') || mat.includes('open')) {
        loose++;
      } else {
        solid++;
      }

      const res = p.analysisResults[0];
      if (res?.gradeEligible && res?.grade) {
        graded++;
        grades[res.grade] = (grades[res.grade] || 0) + 1;
      } else {
        insufficient++;
        const r = res?.reasonCode || 'NO_RECORD';
        reasonCodes[r] = (reasonCodes[r] || 0) + 1;
      }
    });

    return {
      name: c.name,
      id: c.id,
      productsCount: c._count.products,
      standardsCount: c._count.standards,
      researchCount: c._count.researchData,
      barcodedProducts,
      matrices: { solid, liquid, loose },
      graded,
      insufficient,
      grades,
      reasonCodes
    };
  });
  console.log('=== CATEGORIES ===');
  console.log(JSON.stringify(catSummary, null, 2));

  // Contaminant breakdown
  const metals = await prisma.researchData.groupBy({
    by: ['contaminant', 'unit', 'basis'],
    _count: { _all: true },
    _avg: { concentration: true },
    _min: { concentration: true },
    _max: { concentration: true }
  });
  console.log('=== METALS ===');
  console.log(JSON.stringify(metals, null, 2));

  // Measurement status
  const statuses = await prisma.researchData.groupBy({
    by: ['measurementStatus'],
    _count: { _all: true }
  });
  console.log('=== MEASUREMENT STATUS ===');
  console.log(JSON.stringify(statuses, null, 2));

  // Evidence level
  const evidence = await prisma.researchData.groupBy({
    by: ['evidenceLevel'],
    _count: { _all: true }
  });
  console.log('=== EVIDENCE ===');
  console.log(JSON.stringify(evidence, null, 2));

  // Overall grades
  const grades = await prisma.analysisResult.groupBy({
    by: ['grade', 'gradeEligible', 'reasonCode'],
    _count: { _all: true }
  });
  console.log('=== GRADES ===');
  console.log(JSON.stringify(grades, null, 2));

  // Highest driver contaminant in Grade F
  const fAnalyses = await prisma.analysisResult.findMany({
    where: { grade: 'F' },
    select: { highestContaminant: true }
  });
  const driverCounts: Record<string, number> = {};
  fAnalyses.forEach(a => {
    const d = a.highestContaminant || 'UNKNOWN';
    driverCounts[d] = (driverCounts[d] || 0) + 1;
  });
  console.log('=== DRIVER CONTAMINANTS (GRADE F) ===');
  console.log(JSON.stringify(driverCounts, null, 2));

  // Top commercial brands
  const brands = await prisma.product.groupBy({
    by: ['brand'],
    _count: { _all: true },
    orderBy: { _count: { brand: 'desc' } },
    take: 30
  });
  console.log('=== TOP BRANDS ===');
  console.log(JSON.stringify(brands, null, 2));

  // Barcode format
  const formats = await prisma.productBarcode.groupBy({
    by: ['format'],
    _count: { _all: true }
  });
  console.log('=== BARCODE FORMATS ===');
  console.log(JSON.stringify(formats, null, 2));

  // Standard authorities
  const stdAuthorities = await prisma.referenceStandard.groupBy({
    by: ['authority', 'referenceRole'],
    _count: { _all: true }
  });
  console.log('=== STANDARD AUTHORITIES ===');
  console.log(JSON.stringify(stdAuthorities, null, 2));

  await prisma.$disconnect();
}

run().catch(console.error);
