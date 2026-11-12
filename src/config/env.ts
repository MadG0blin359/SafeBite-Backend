import { z } from "zod";

/**
 * Native environment variable loading in Node.js 20.12+ / 24+
 * No external dotenv package required.
 */
const envCandidates = [
  `.env.${process.env.NODE_ENV || "development"}.local`,
  `.env.${process.env.NODE_ENV || "development"}`,
  ".env.local",
  ".env",
];

for (const envPath of envCandidates) {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Continue if the specific env file doesn't exist
  }
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("3000")
    .transform((val) => parseInt(val, 10)),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/safebite?schema=public"),
  JWT_SECRET: z
    .string()
    .min(16, { message: "JWT_SECRET must be at least 16 characters" })
    .default("super-secret-jwt-key-safebite-backend-change-in-prod"),
  JWT_EXPIRES_IN: z.string().default("90d"), // 90 days for seamless mobile session
  CORS_ORIGIN: z.string().default("*"),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default("900000") // 15 minutes
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z
    .string()
    .default("100")
    .transform((val) => parseInt(val, 10)),

  // AWS Configuration (for S3 storage)
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional().default("mock-access-key"),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default("mock-secret-key"),
  AWS_S3_BUCKET_NAME: z.string().default("safebite-assets"),

  // Email Delivery (Mailtrap Sending API + optional SMTP fallback)
  MAILTRAP_API_TOKEN: z.string().optional(),
  MAILTRAP_SANDBOX_ID: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || (Number.isInteger(val) && val > 0), {
      message: "MAILTRAP_SANDBOX_ID must be a positive integer",
    }),
  EMAIL_FROM_ADDRESS: z
    .string()
    .trim()
    .email({ message: "EMAIL_FROM_ADDRESS must be a valid email address" })
    .default("noreply@safebite.live"),
  EMAIL_FROM_NAME: z.string().trim().min(1).default("SafeBite"),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .default("587")
    .transform((val) => parseInt(val, 10))
    .refine((val) => Number.isInteger(val) && val > 0 && val <= 65535, {
      message: "SMTP_PORT must be a valid TCP port (1-65535)",
    }),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((val) => val === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("SafeBite <noreply@safebite.live>"),

  // AI Providers for RAG
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
})
.refine(
  (data) => {
    // Fail fast in production if default placeholder secret is still configured (SEC-005)
    if (data.NODE_ENV === "production") {
      return (
        data.JWT_SECRET !== "super-secret-jwt-key-safebite-backend-change-in-prod" &&
        data.JWT_SECRET.length >= 32
      );
    }
    return true;
  },
  {
    message:
      "In production, JWT_SECRET must be explicitly set and be at least 32 characters long",
    path: ["JWT_SECRET"],
  }
);

const sanitizeEnv = () => {
  const rawEnv: Record<string, any> = {};
  for (const [key, val] of Object.entries(process.env)) {
    rawEnv[key] = val === "" ? undefined : val;
  }

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.format());
    throw new Error("Invalid environment configuration.");
  }

  return parsed.data;
};

export const env = sanitizeEnv();
export type Env = typeof env;
