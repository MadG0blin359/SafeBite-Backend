import { ContaminantType, ReferenceRole, StandardAuthority } from "@prisma/client";
import { z } from "zod";

export const listStandardsQuerySchema = z.object({
  categoryId: z.string().uuid({ message: "categoryId must be a valid UUID" }).optional(),
  authority: z.nativeEnum(StandardAuthority).optional(),
  contaminant: z.nativeEnum(ContaminantType).optional(),
  referenceRole: z.nativeEnum(ReferenceRole).optional(),
  standardCode: z.string().trim().min(1).max(60).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const resolveCategoryStandardsQuerySchema = z.object({
  matrix: z.string().trim().min(1).max(150).optional(),
  contaminant: z.nativeEnum(ContaminantType).optional(),
});

export const standardIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid standard ID format" }),
});

export const categoryIdParamSchema = z.object({
  categoryId: z.string().uuid({ message: "Invalid category ID format" }),
});

export type ListStandardsQuery = z.infer<typeof listStandardsQuerySchema>;
export type ResolveCategoryStandardsQuery = z.infer<typeof resolveCategoryStandardsQuerySchema>;
