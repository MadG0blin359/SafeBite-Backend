import { Request, Response } from "express";
import { storageService } from "../services/storage.service.js";
import { AppError } from "../utils/app-error.js";

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new AppError(400, "No file uploaded. Key 'file' is required.");
  }

  const folder = (req.body.folder as string) || "products";
  const result = await storageService.uploadFile(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    undefined,
    folder
  );

  res.status(201).json({
    success: true,
    message: "File uploaded successfully",
    data: result,
  });
};

export const getPresignedUploadUrl = async (req: Request, res: Response): Promise<void> => {
  const { fileName, mimeType, folder } = req.body;

  const result = await storageService.createPresignedUploadUrl(
    fileName,
    mimeType,
    undefined,
    folder || "products"
  );

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const createSignedUrl = async (req: Request, res: Response): Promise<void> => {
  const { path: filePath, expiresIn } = req.body;

  const isAdmin = req.user?.role === "ADMIN";
  const userId = req.user?.id;

  // Authorization check (SEC-003 BOLA/IDOR):
  // Non-admins can only generate signed URLs for public assets (products/, research/) or their own uploads (users/<userId>/...)
  if (!isAdmin) {
    const isPublic = filePath.startsWith("products/") || filePath.startsWith("research/");
    const isOwner = userId && filePath.startsWith(`users/${userId}/`);
    if (!isPublic && !isOwner) {
      throw new AppError(403, "Forbidden: You do not have permission to access private storage keys outside your account");
    }
  }

  const expiration = Number(expiresIn) || 3600;
  const signedUrl = await storageService.createSignedUrl(filePath, expiration);

  res.status(200).json({
    success: true,
    data: {
      signedUrl,
      expiresIn: expiration,
    },
  });
};

export const listFiles = async (req: Request, res: Response): Promise<void> => {
  const folder = (req.query.folder as string) || "";
  const isAdmin = req.user?.role === "ADMIN";
  const userId = req.user?.id;

  // Non-admins can only list public catalog folders or their own files (SEC-003)
  if (!isAdmin) {
    const isAllowedPublicFolder = folder === "products" || folder === "research";
    const isOwnUserFolder = userId && folder === `users/${userId}`;
    if (!isAllowedPublicFolder && !isOwnUserFolder) {
      throw new AppError(403, "Forbidden: File listing is restricted to public catalogs or your own user directory");
    }
  }

  const files = await storageService.listFiles(folder);

  res.status(200).json({
    success: true,
    data: files,
  });
};

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  const { paths } = req.body as { paths: string[] };

  const isAdmin = req.user?.role === "ADMIN";
  const userId = req.user?.id;

  // Authorization check (SEC-003 BOLA/IDOR):
  // Non-admins can strictly delete ONLY objects within their own directory (users/<userId>/...)
  for (const filePath of paths) {
    if (!isAdmin) {
      const userPrefix = `users/${userId}/`;
      if (!filePath.startsWith(userPrefix)) {
        throw new AppError(
          403,
          `Forbidden: You do not have permission to delete storage object '${filePath}'`
        );
      }
    }
  }

  const result = await storageService.deleteFiles(paths);

  res.status(200).json({
    success: true,
    message: "Files deleted successfully",
    data: result,
  });
};
