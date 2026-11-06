import { Application } from "express";
import swaggerUi from "swagger-ui-express";

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "SafeBite API",
    version: "1.0.0",
    description: "AI-Powered Food Safety Intelligence REST API for Pakistani Packaged Foods (SRS v4.1 compliant).",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Native JWT access token",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error message details" },
          statusCode: { type: "number", example: 400 },
        },
      },
      SignUpRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
          password: { type: "string", minLength: 6, example: "Secret123!" },
          fullName: { type: "string", example: "Jane Doe" },
        },
      },
      SignInRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
          password: { type: "string", example: "Secret123!" },
        },
      },
      UserResponse: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string" },
          fullName: { type: "string" },
          role: { type: "string", example: "USER" },
          healthConsent: { type: "boolean" },
          healthTags: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Liveness probe",
        responses: {
          200: { description: "Service is healthy and running" },
        },
      },
    },
    "/ready": {
      get: {
        summary: "Readiness probe",
        description: "Checks connectivity to PostgreSQL database and pgvector extension",
        responses: {
          200: { description: "Service, PostgreSQL, and pgvector are ready" },
          503: { description: "Database is unavailable" },
        },
      },
    },
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register new user account",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SignUpRequest" } } },
        },
        responses: {
          201: { description: "User registered successfully" },
          400: { description: "Validation error" },
          409: { description: "User already exists" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate user and get 90-day JWT token",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SignInRequest" } } },
        },
        responses: {
          200: { description: "Login successful with JWT token" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/profile": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user profile",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Authenticated user details" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/storage/upload": {
      post: {
        tags: ["Storage"],
        summary: "Upload a file through server buffer to AWS S3",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  folder: { type: "string", example: "products" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "File uploaded successfully to S3" },
          400: { description: "No file provided" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/storage/signed-upload": {
      post: {
        tags: ["Storage"],
        summary: "Request a presigned PUT upload URL for direct mobile-to-S3 upload",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fileName", "mimeType"],
                properties: {
                  fileName: { type: "string", example: "packaging.jpg" },
                  mimeType: { type: "string", example: "image/jpeg" },
                  folder: { type: "string", example: "products" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Presigned S3 upload URL returned" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/user/history": {
      get: {
        tags: ["User Data"],
        summary: "Get user scan and search history (FR-12)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "User history retrieved" },
        },
      },
      delete: {
        tags: ["User Data"],
        summary: "Complete history wipe (NFR-PR-02)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "All scan and search history deleted" },
        },
      },
    },
    "/api/user/favorites": {
      get: {
        tags: ["User Data"],
        summary: "List user favorite products (FR-13)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Favorites retrieved" },
        },
      },
    },
    "/api/user/watchlist": {
      get: {
        tags: ["User Data"],
        summary: "List user watchlist with assessment change detection (FR-13)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Watchlist items retrieved" },
        },
      },
    },
    "/api/user/health-profile": {
      get: {
        tags: ["User Data"],
        summary: "Get health profile and consented tags (FR-16)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Health profile retrieved" },
        },
      },
      delete: {
        tags: ["User Data"],
        summary: "Revoke consent and delete health tags (FR-16-02)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Consent revoked and tags cleared" },
        },
      },
    },
  },
};

export const setupSwagger = (app: Application): void => {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

export default setupSwagger;
