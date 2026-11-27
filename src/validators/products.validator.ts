import { z } from "zod";

const booleanQueryParam = z
  .preprocess((val) => {
    if (typeof val === "string") {
      if (val.toLowerCase() === "true") return true;
      if (val.toLowerCase() === "false") return false;
    }
    return val;
  }, z.boolean())
  .optional();

export const listProductsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  categoryId: z.string().uuid({ message: "categoryId must be a valid UUID" }).optional(),
  brand: z.string().trim().min(1).max(100).optional(),
  hasBarcode: booleanQueryParam,
  productType: z
    .enum(["COMMERCIAL_PACKAGED", "INFORMAL_WRAPPED", "LOOSE_COMMODITY", "RESEARCH_BENCHMARK"])
    .optional(),
  includeBenchmarks: booleanQueryParam,
  grade: z.enum(["A", "B", "C", "D", "F"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const productIdParamSchema = z.object({
  id: z.string().trim().min(1, { message: "Product identifier is required" }).max(100),
});

export const barcodeParamSchema = z.object({
  barcode: z
    .string()
    .trim()
    .min(3, { message: "Barcode must be at least 3 characters" })
    .max(30, { message: "Barcode cannot exceed 30 characters" }),
});

export const categoryIdParamSchema = z.object({
  id: z.string().uuid({ message: "Category ID must be a valid UUID" }),
});

export const categoryProductsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const safetyProductIdParamSchema = z.object({
  productId: z.string().trim().min(1, { message: "Product ID is required" }).max(100),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CategoryProductsQuery = z.infer<typeof categoryProductsQuerySchema>;
