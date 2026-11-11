import { createServer as createHttpServer, Server } from "http";
import createApp from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./utils/logger.js";

let server: Server | undefined;
let isShuttingDown = false;

// Catch unhandled synchronous exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error("UNCAUGHT EXCEPTION! Shutting down...", err);
  process.exit(1);
});

/**
 * Verify essential FYP-1 runtime dependencies before accepting HTTP traffic.
 */
async function verifyFyp1Dependencies(): Promise<void> {
  // 1. PostgreSQL reachability (Docker / local DB must be running for API routes)
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: any) {
    logger.error(
      "PostgreSQL is unreachable. Ensure Docker / PostgreSQL is running (e.g., 'docker compose up -d') and verify DATABASE_URL.",
      error?.message || error
    );
    throw error;
  }

  // 2. Verify pgvector extension & schema migrations status
  try {
    const vectorCheck = (await prisma.$queryRaw`
      SELECT extversion FROM pg_extension WHERE extname = 'vector';
    `) as Array<{ extversion: string }>;

    const usersTableCheck = (await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'users';
    `) as Array<{ tablename: string }>;

    if (vectorCheck.length > 0 && usersTableCheck.length > 0) {
      logger.info(`✅ PostgreSQL connected (pgvector v${vectorCheck[0].extversion} enabled, schema ready)`);
    } else {
      if (vectorCheck.length === 0) {
        logger.warn(
          "PostgreSQL connected, but 'pgvector' extension is not enabled yet. Run 'npm run prisma:migrate'."
        );
      }
      if (usersTableCheck.length === 0) {
        logger.warn(
          "Database schema is not migrated yet (missing 'users' table). Run 'npm run prisma:migrate'."
        );
      }
    }
  } catch (error: any) {
    logger.warn(
      "PostgreSQL connected, but extension/schema metadata check failed.",
      error?.message || error
    );
  }
}

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`🛑 ${signal} received. Closing HTTP server and database connections...`);

  const disconnectAndExit = async () => {
    try {
      await prisma.$disconnect();
      logger.info("✅ Database connections closed. Process terminating.");
    } catch (err) {
      logger.error("Error disconnecting Prisma during shutdown:", err);
    } finally {
      process.exit(exitCode);
    }
  };

  if (server) {
    server.close(() => {
      void disconnectAndExit();
    });
    server.closeIdleConnections?.();
  } else {
    await disconnectAndExit();
  }
}

/**
 * Bootstrap FYP-1 server dependencies and start listening for HTTP requests.
 */
export async function bootstrap(): Promise<void> {
  try {
    await verifyFyp1Dependencies();

    const app = createApp();

    server = await new Promise<Server>((resolve, reject) => {
      const httpServer = createHttpServer(app);
      httpServer.once("error", (err) => {
        reject(err);
      });
      httpServer.listen(env.PORT, () => {
        resolve(httpServer);
      });
    });

    logger.info(`🚀 Server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
    logger.info(`📑 API Documentation: http://localhost:${env.PORT}/docs`);
    logger.info(`🩺 Health check: http://localhost:${env.PORT}/health`);
    logger.info(`🩺 Readiness check: http://localhost:${env.PORT}/ready`);
  } catch (error) {
    logger.error("Fatal error during server bootstrap. Exiting.", error);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  }
}

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason: any) => {
  logger.error("UNHANDLED REJECTION!", reason);
  void shutdown("unhandledRejection", 1);
});

// Graceful shutdown on termination signals
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void shutdown(signal, 0);
  });
}

void bootstrap();
