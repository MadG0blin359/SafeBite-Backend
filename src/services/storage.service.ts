import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  ALLOWED_FOLDERS,
} from "../validators/storage.validator.js";

// Initialize AWS S3 Client
export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || "mock-access-key",
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || "mock-secret-key",
  },
});

function sanitizeStorageFolder(folder: string): string {
  const cleaned = folder.replace(/[^a-zA-Z0-9_\-\/]/g, "").replace(/\.\./g, "");
  const baseFolder = cleaned.split("/")[0] || "products";
  if (!ALLOWED_FOLDERS.includes(baseFolder as any)) {
    throw new AppError(400, `Invalid folder prefix. Allowed base folders: ${ALLOWED_FOLDERS.join(", ")}`);
  }
  return cleaned;
}

function validateFileMimeAndExt(originalName: string, mimeType: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
    throw new AppError(400, `Unsupported file extension: ${ext}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`);
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase() as any)) {
    throw new AppError(400, `Unsupported file MIME type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`);
  }

  return ext;
}

export const storageService = {
  /**
   * Uploads a file buffer to AWS S3 bucket with strict type validation (SEC-002, SEC-004).
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    bucket = env.AWS_S3_BUCKET_NAME,
    folder = "products"
  ) {
    const ext = validateFileMimeAndExt(originalName, mimeType);
    const safeFolder = sanitizeStorageFolder(folder);
    const uniqueKey = `${safeFolder}/${crypto.randomUUID()}${ext}`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: uniqueKey,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await s3Client.send(command);

      const publicUrl = `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${uniqueKey}`;

      return {
        key: uniqueKey,
        bucket,
        publicUrl,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error(`S3 Upload failed for key ${uniqueKey}:`, err);
      throw new AppError(500, `Storage upload failed: ${err.message}`);
    }
  },

  /**
   * Generates a temporary signed PUT upload URL for direct client-to-S3 uploads (SEC-002, SEC-004).
   */
  async createPresignedUploadUrl(
    originalName: string,
    mimeType: string,
    bucket = env.AWS_S3_BUCKET_NAME,
    folder = "products",
    expiresInSeconds = 900 // 15 mins
  ) {
    const ext = validateFileMimeAndExt(originalName, mimeType);
    const safeFolder = sanitizeStorageFolder(folder);
    const uniqueKey = `${safeFolder}/${crypto.randomUUID()}${ext}`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: uniqueKey,
        ContentType: mimeType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      const publicUrl = `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${uniqueKey}`;

      return {
        key: uniqueKey,
        uploadUrl,
        publicUrl,
        expiresInSeconds,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error(`Failed to generate presigned upload URL for ${uniqueKey}:`, err);
      throw new AppError(500, `Failed to create presigned upload URL: ${err.message}`);
    }
  },

  /**
   * Generates a temporary signed download URL for private S3 objects (SEC-003).
   */
  async createSignedUrl(
    key: string,
    expiresInSeconds = 3600,
    bucket = env.AWS_S3_BUCKET_NAME
  ) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return signedUrl;
    } catch (err: any) {
      logger.error(`Failed to generate presigned URL for ${key}:`, err);
      throw new AppError(500, `Failed to create signed URL: ${err.message}`);
    }
  },

  /**
   * List files in a specific S3 bucket prefix / folder.
   */
  async listFiles(prefix = "", bucket = env.AWS_S3_BUCKET_NAME) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 100,
      });

      const response = await s3Client.send(command);

      return (
        response.Contents?.map((item) => ({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
        })) || []
      );
    } catch (err: any) {
      logger.error(`Failed to list files with prefix ${prefix}:`, err);
      throw new AppError(500, `Failed to list files: ${err.message}`);
    }
  },

  /**
   * Deletes files by their S3 keys.
   */
  async deleteFiles(keys: string[], bucket = env.AWS_S3_BUCKET_NAME) {
    try {
      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      });

      const response = await s3Client.send(command);
      return response.Deleted || [];
    } catch (err: any) {
      logger.error("Failed to delete S3 objects:", err);
      throw new AppError(500, `Failed to delete files: ${err.message}`);
    }
  },
};

export default storageService;
