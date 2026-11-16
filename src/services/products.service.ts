import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { ACTIVE_RULE_VERSION } from "../constants/status.constants.js";
import { getBarcodeLookupCandidates } from "../utils/barcode.utils.js";
import {
  ListProductsQuery,
  CategoryProductsQuery,
} from "../validators/products.validator.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PRODUCT_DETAIL_INCLUDE = {
  category: true,
  barcodes: {
    select: { barcode: true },
  },
  analysisResults: {
    where: { ruleVersion: ACTIVE_RULE_VERSION },
    orderBy: { calculatedAt: "desc" },
    take: 1,
  },
  researchData: {
    include: {
      source: {
        select: {
          id: true,
          externalSourceId: true,
          title: true,
          doi: true,
          url: true,
          authors: true,
          publicationYear: true,
          journal: true,
        },
      },
    },
    orderBy: { contaminant: "asc" },
  },
} satisfies Prisma.ProductInclude;

function formatProductDetail(product: any, matchedBarcode?: string) {
  const allBarcodes = new Set<string>();
  if (product.barcode) allBarcodes.add(product.barcode);
  product.barcodes.forEach((b: { barcode: string }) => allBarcodes.add(b.barcode));

  return {
    id: product.id,
    productCode: product.productCode,
    name: product.name,
    brand: product.brand,
    packageSize: product.packageSize,
    matrix: product.matrix,
    imageUrl: product.imageUrl,
    category: product.category,
    ...(matchedBarcode ? { matchedBarcode } : {}),
    primaryBarcode: product.barcode,
    barcodes: Array.from(allBarcodes),
    latestAnalysis: product.analysisResults[0] || null,
    researchMeasurements: product.researchData.map((rd: any) => ({
      id: rd.id,
      contaminant: rd.contaminant,
      concentration: rd.concentration,
      unit: rd.unit,
      basis: rd.basis,
      evidenceLevel: rd.evidenceLevel,
      measurementStatus: rd.measurementStatus,
      sd: rd.sd,
      qualifier: rd.qualifier,
      flag: rd.flag,
      source: rd.source,
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export const productsService = {
  /**
   * List products with pagination, search, and multidimensional filters.
   */
  async listProducts(query: ListProductsQuery) {
    const {
      search,
      q,
      categoryId,
      brand,
      hasBarcode,
      grade,
      page = 1,
      limit = 20,
    } = query;

    const searchTerm = search || q;

    const where: Prisma.ProductWhereInput = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (brand) {
      where.brand = { contains: brand, mode: "insensitive" };
    }

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { brand: { contains: searchTerm, mode: "insensitive" } },
        { productCode: { contains: searchTerm, mode: "insensitive" } },
        { barcode: { contains: searchTerm } },
        { barcodes: { some: { barcode: { contains: searchTerm } } } },
      ];
    }

    if (hasBarcode !== undefined) {
      if (hasBarcode) {
        where.OR = [
          ...(where.OR || []),
          { barcode: { not: null } },
          { barcodes: { some: {} } },
        ];
      } else {
        where.barcode = null;
        where.barcodes = { none: {} };
      }
    }

    if (grade) {
      where.analysisResults = {
        some: {
          ruleVersion: ACTIVE_RULE_VERSION,
          grade,
        },
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ brand: "asc" }, { name: "asc" }],
        include: {
          category: {
            select: { id: true, name: true, description: true },
          },
          barcodes: {
            select: { barcode: true },
          },
          analysisResults: {
            where: { ruleVersion: ACTIVE_RULE_VERSION },
            orderBy: { calculatedAt: "desc" },
            take: 1,
            select: {
              grade: true,
              cci: true,
              maxClr: true,
              statusText: true,
              reasonCode: true,
              calculatedAt: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const formattedItems = items.map((product) => {
      const allBarcodes = new Set<string>();
      if (product.barcode) allBarcodes.add(product.barcode);
      product.barcodes.forEach((b) => allBarcodes.add(b.barcode));

      return {
        id: product.id,
        productCode: product.productCode,
        name: product.name,
        brand: product.brand,
        packageSize: product.packageSize,
        matrix: product.matrix,
        imageUrl: product.imageUrl,
        category: product.category,
        primaryBarcode: product.barcode,
        barcodes: Array.from(allBarcodes),
        latestAnalysis: product.analysisResults[0] || null,
        createdAt: product.createdAt,
      };
    });

    return {
      items: formattedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get product details by ID or productCode.
   */
  async getProductById(identifier: string) {
    const isUuid = UUID_REGEX.test(identifier);

    const product = isUuid
      ? await prisma.product.findUnique({
          where: { id: identifier },
          include: PRODUCT_DETAIL_INCLUDE,
        })
      : await prisma.product.findFirst({
          where: {
            OR: [
              { productCode: { equals: identifier, mode: "insensitive" } },
              { id: identifier },
            ],
          },
          include: PRODUCT_DETAIL_INCLUDE,
        });

    if (!product) {
      throw new AppError(404, `Product not found for identifier: ${identifier}`);
    }

    return formatProductDetail(product);
  },

  /**
   * Look up product by retail barcode across primary and secondary barcode tables.
   * Tolerates stripped leading zeros (UPC-A / EAN-13 padding).
   */
  async getProductByBarcode(barcode: string) {
    const candidateBarcodes = getBarcodeLookupCandidates(barcode);

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: { in: candidateBarcodes } },
          { barcodes: { some: { barcode: { in: candidateBarcodes } } } },
        ],
      },
      include: PRODUCT_DETAIL_INCLUDE,
    });

    if (!product) {
      throw new AppError(404, `No food product found matching barcode: ${barcode.trim()}`);
    }

    return formatProductDetail(product, barcode.trim());
  },

  /**
   * List all 21 food categories with product counts and reference standard counts.
   */
  async listCategories() {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            products: true,
            standards: true,
          },
        },
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      productCount: cat._count.products,
      referenceStandardCount: cat._count.standards,
      createdAt: cat.createdAt,
    }));
  },

  /**
   * Get category by ID with associated statistics and metadata.
   */
  async getCategoryById(categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            products: true,
            standards: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppError(404, `Category not found for ID: ${categoryId}`);
    }

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      productCount: category._count.products,
      referenceStandardCount: category._count.standards,
      createdAt: category.createdAt,
    };
  },

  /**
   * List products in a specific category.
   */
  async getCategoryProducts(categoryId: string, query: CategoryProductsQuery) {
    const { search, page = 1, limit = 20 } = query;

    // Verify category exists
    await this.getCategoryById(categoryId);

    return this.listProducts({
      categoryId,
      search,
      page,
      limit,
    });
  },
};

export default productsService;
