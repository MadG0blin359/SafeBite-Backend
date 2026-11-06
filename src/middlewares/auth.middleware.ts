import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { SafeBiteUserPayload } from "../types/express.d.js";

/**
 * Middleware requiring a valid JWT Bearer token.
 * Attaches the authenticated SafeBiteUserPayload to `req.user`.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "Authentication token missing or invalid format (Bearer token expected)");
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new AppError(401, "Bearer token is empty");
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as SafeBiteUserPayload;
    req.user = decoded;
    req.token = token;
    next();
  } catch {
    throw new AppError(401, "Invalid or expired authentication token");
  }
};

/**
 * Role-Based Access Control: Middleware requiring ADMIN role (SEC-003).
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  if (req.user.role !== "ADMIN") {
    throw new AppError(403, "Forbidden: Administrative privileges required");
  }

  next();
};

/**
 * Optional Auth middleware: attaches `req.user` if valid token is provided,
 * but allows the request to continue if no token is sent.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as SafeBiteUserPayload;
        req.user = decoded;
        req.token = token;
      } catch {
        // Intentionally ignore failure in optional auth
      }
    }
  }

  next();
};
