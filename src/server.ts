import { createServer, Server } from "http";
import createApp from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./utils/logger.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

let server: Server | undefined;
let isShuttingDown = false;

async function verifyDatabaseConnection(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;

  const [vectorRows, usersTableRows] = await Promise.all([
    prisma.$queryRaw<Array<{ extversion: string }>>`
      SELECT extversion FROM pg_extension WHERE extname = 'vector';
    `,
    prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'users';
    `,
  ]);

  if (vectorRows.length === 0) {
    logger.warn("PostgreSQL extension 'vector' is not enabled; run pending database migrations.");
  }

  if (usersTableRows.length === 0) {
    logger.warn("Database schema is not initialized (missing 'users' table); run pending migrations.");
  }

  if (vectorRows.length > 0 && usersTableRows.length > 0) {
    logger.info(`PostgreSQL connected (pgvector v${vectorRows[0].extversion})`);
  }
}

function startHttpServer(port: number): Promise<Server> {
  const app = createApp();
  const httpServer = createServer(app);

  return new Promise<Server>((resolve, reject) => {
    const onError = (err: Error) => {
      reject(err);
    };

    httpServer.once("error", onError);
    httpServer.listen(port, () => {
      httpServer.off("error", onError);
      resolve(httpServer);
    });
  });
}

async function shutdown(reason: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${reason}. Initiating graceful shutdown...`);

  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out; forcing process exit.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  const closeDatabase = async () => {
    try {
      await prisma.$disconnect();
      logger.info("Server and database connections closed.");
      process.exit(exitCode);
    } catch (err) {
      logger.error("Error while disconnecting database:", err);
      process.exit(1);
    }
  };

  if (server?.listening) {
    server.close(() => {
      void closeDatabase();
    });
    server.closeIdleConnections?.();
  } else {
    await closeDatabase();
  }
}

async function bootstrap(): Promise<void> {
  try {
    await verifyDatabaseConnection();
    server = await startHttpServer(env.PORT);

    logger.info(`Server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
    logger.info(`API Documentation: http://localhost:${env.PORT}/docs`);
    logger.info(`Health check: http://localhost:${env.PORT}/health`);
    logger.info(`Readiness check: http://localhost:${env.PORT}/ready`);
  } catch (error) {
    logger.error("Server bootstrap failed:", error);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  }
}

process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught exception; terminating process:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled promise rejection:", reason);
  void shutdown("unhandledRejection", 1);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void shutdown(signal, 0);
  });
}

void bootstrap();
