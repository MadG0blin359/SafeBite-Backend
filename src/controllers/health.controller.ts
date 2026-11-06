import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

/**
 * Basic liveness probe.
 */
export const getHealth = (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    status: "healthy",
    service: "safebite-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Deep readiness probe verifying PostgreSQL and pgvector connectivity.
 */
export const getReadiness = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify PostgreSQL database connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Check pgvector extension status
    const vectorCheck = (await prisma.$queryRaw`
      SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
    `) as Array<{ extname: string; extversion: string }>;

    const vectorEnabled = vectorCheck && vectorCheck.length > 0;

    res.status(200).json({
      success: true,
      status: "ready",
      checks: {
        server: "healthy",
        database: "connected (PostgreSQL)",
        pgvector: vectorEnabled ? `enabled (v${vectorCheck[0].extversion})` : "not installed",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      error: err.message || "Unknown error connecting to database",
      timestamp: new Date().toISOString(),
    });
  }
};
