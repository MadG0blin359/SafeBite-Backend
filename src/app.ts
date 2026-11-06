import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes/index.js";
import errorHandler from "./middlewares/error.handler.js";
import { setupSwagger } from "./utils/swagger.js";
import { apiRateLimiter } from "./middlewares/rate-limit.middleware.js";
import { env } from "./config/env.js";

export function createApp(): Express {
  const app: Express = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  const allowedOrigins = env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",");
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  // Request Body Parsers (SEC-008: 100kb limit prevents JSON flooding DoS; S3 multipart uploads are handled by Multer)
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  // HTTP Request Logger
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  // Swagger Documentation
  setupSwagger(app);

  // General Rate Limiter on API routes
  app.use("/api", apiRateLimiter);

  // Mount API & Health routes
  app.use(routes);

  // 404 Catch-All Handler (Express 5 compatible)
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
