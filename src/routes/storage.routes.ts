import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  uploadFile,
  getPresignedUploadUrl,
  createSignedUrl,
  listFiles,
  deleteFile,
} from "../controllers/storage.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  signedUploadSchema,
  signedUrlSchema,
  deleteFilesSchema,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
} from "../validators/storage.validator.js";
import { AppError } from "../utils/app-error.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
    const isAllowedMime = (ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype as any);

    if (isAllowedExt && isAllowedMime) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          400,
          `Invalid file type. Only JPEG, PNG, and WebP images are permitted (received: ${file.mimetype}).`
        )
      );
    }
  },
});

const router = Router();

// Upload file directly through server buffer to AWS S3 Storage (requires Auth & strict MIME filter)
router.post("/upload", requireAuth, upload.single("file"), uploadFile);

// Request a presigned S3 PUT upload URL for direct mobile/client upload (SEC-002, SEC-004)
router.post(
  "/signed-upload",
  requireAuth,
  validate({ body: signedUploadSchema }),
  getPresignedUploadUrl
);

// Generate signed download URL for private files (SEC-003)
router.post(
  "/signed-url",
  requireAuth,
  validate({ body: signedUrlSchema }),
  createSignedUrl
);

// List files in bucket (SEC-003: scoped to public folders or own user directory)
router.get("/files", requireAuth, listFiles);

// Delete files from storage (SEC-003: scoped to own user directory or ADMIN)
router.delete(
  "/files",
  requireAuth,
  validate({ body: deleteFilesSchema }),
  deleteFile
);

export default router;
