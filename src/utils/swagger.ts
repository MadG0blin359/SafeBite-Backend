import { Application, Request, Response } from "express";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { logger } from "./logger.js";

function loadOpenApiSpec(): Record<string, any> {
  const candidates = [
    new URL("../../openapi.json", import.meta.url),
    path.resolve(process.cwd(), "openapi.json"),
  ];

  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, "utf-8");
      return JSON.parse(raw);
    } catch {
      // Try next path candidate
    }
  }

  logger.error("Failed to load openapi.json specification file.");
  return {
    openapi: "3.0.3",
    info: { title: "SafeBite API", version: "1.0.0" },
    paths: {},
  };
}

export const setupSwagger = (app: Application): void => {
  const swaggerDocument = loadOpenApiSpec();

  // Serve raw OpenAPI 3.0 JSON spec (for Postman / client SDK generators)
  app.get("/openapi.json", (_req: Request, res: Response) => {
    res.status(200).json(swaggerDocument);
  });

  // Serve interactive Swagger UI
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

export default setupSwagger;
