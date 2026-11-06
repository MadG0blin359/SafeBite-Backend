import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";
import multer from "multer";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Uploaded file exceeds the maximum allowed file size.";
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Handle Prisma Database Errors
  if (err.code && typeof err.code === "string") {
    // Prisma Unique Constraint Violation
    if (err.code === "P2002") {
      statusCode = 409;
      const target = err.meta?.target ? ` on field: ${err.meta.target}` : "";
      message = `Resource already exists or violates unique constraint${target}.`;
    }
    // Prisma Record Not Found
    if (err.code === "P2025") {
      statusCode = 404;
      message = "Record not found.";
    }
  }

  // Log non-operational (server crash / unhandled bug) errors
  if (!err.isOperational && statusCode === 500) {
    logger.error(`Unhandled Exception on ${req.method} ${req.originalUrl}:`, err);
  }

  const responseBody: Record<string, any> = {
    success: false,
    message,
    statusCode,
  };

  if (process.env.NODE_ENV === "development") {
    responseBody.stack = err.stack;
    responseBody.details = err;
  }

  res.status(statusCode).json(responseBody);
};

export default errorHandler;
