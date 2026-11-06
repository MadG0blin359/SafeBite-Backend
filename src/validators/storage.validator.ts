import { z } from "zod";
import path from "path";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const ALLOWED_FOLDERS = [
  "products",
  "users",
  "research",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

export const signedUploadSchema = z.object({
  fileName: z
    .string({ required_error: "fileName is required" })
    .trim()
    .min(1, { message: "fileName cannot be empty" })
    .max(100, { message: "fileName cannot exceed 100 characters" })
    .refine((val) => !val.includes("/") && !val.includes("\\") && !val.includes(".."), {
      message: "fileName cannot contain path separators or directory traversal sequences",
    })
    .refine(
      (val) => {
        const ext = path.extname(val).toLowerCase();
        return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
      },
      {
        message: `File extension must be one of: ${ALLOWED_EXTENSIONS.join(", ")}`,
      }
    ),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({
      message: `Unsupported mimeType. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    }),
  }),
  folder: z.enum(ALLOWED_FOLDERS).default("products"),
});

export const signedUrlSchema = z.object({
  path: z
    .string({ required_error: "Path string is required" })
    .trim()
    .min(1, { message: "Path cannot be empty" })
    .max(255, { message: "Path cannot exceed 255 characters" })
    .refine((val) => !val.includes(".."), {
      message: "Path cannot contain directory traversal sequences (..)",
    }),
  expiresIn: z
    .number()
    .int()
    .min(60, { message: "Expiration must be at least 60 seconds" })
    .max(86400, { message: "Expiration cannot exceed 86,400 seconds (24 hours)" })
    .default(3600),
});

export const deleteFilesSchema = z.object({
  paths: z
    .array(
      z
        .string()
        .trim()
        .min(1, { message: "Path cannot be empty" })
        .refine((val) => !val.includes(".."), {
          message: "Path cannot contain directory traversal sequences (..)",
        })
    )
    .min(1, { message: "At least one file path must be provided" })
    .max(50, { message: "Cannot delete more than 50 files in a single batch" }),
});

export type SignedUploadInput = z.infer<typeof signedUploadSchema>;
export type SignedUrlInput = z.infer<typeof signedUrlSchema>;
export type DeleteFilesInput = z.infer<typeof deleteFilesSchema>;
