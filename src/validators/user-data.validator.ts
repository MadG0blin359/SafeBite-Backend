import { z } from "zod";

export const ALLOWED_HEALTH_TAGS = [
  "PREGNANCY",
  "INFANT",
  "KIDNEY_ISSUE",
  "HYPERTENSION",
  "DIABETES",
  "CELIAC",
  "NUT_ALLERGY",
  "HEART_CONDITION",
  "ELDERLY",
  "GENERAL_POPULATION",
] as const;

export type HealthTag = (typeof ALLOWED_HEALTH_TAGS)[number];

export const recordScanSchema = z.object({
  productId: z.string().uuid({ message: "Valid product UUID is required" }),
});

export const recordSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, { message: "Query string cannot be empty or whitespace only" })
    .max(150, { message: "Query string cannot exceed 150 characters" }),
});

export const healthConsentSchema = z.object({
  consent: z.boolean({ required_error: "Consent boolean (true/false) is required" }),
});

export const healthTagsSchema = z.object({
  tags: z
    .array(
      z
        .string()
        .trim()
        .toUpperCase()
        .refine((tag): tag is HealthTag => (ALLOWED_HEALTH_TAGS as readonly string[]).includes(tag), {
          message: `Invalid health-context tag. Allowed tags: ${ALLOWED_HEALTH_TAGS.join(", ")}`,
        })
    )
    .min(1, { message: "At least one health-context tag must be provided" })
    .max(10, { message: "Maximum 10 health-context tags allowed per profile" }),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid({ message: "Invalid product ID format" }),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
});
