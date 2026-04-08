import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_SSL: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((value) => value === "true"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  APP_BASE_URL: z.string().url(),
  API_BASE_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  CORS_ALLOWED_ORIGINS: z.string().default("*"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REGISTER: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_MAX_LOGIN: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_MAX_MAGIC_LINK: z.coerce.number().int().positive().default(10),
  AUTH_MAGIC_LINK_ENABLED: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => (value ? value === "true" : undefined)),
  LOG_REQUESTS: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => (value ? value === "true" : undefined))
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${issues}`);
}

const base = parsed.data;

export const env = {
  ...base,
  AUTH_MAGIC_LINK_ENABLED: base.AUTH_MAGIC_LINK_ENABLED ?? false,
  LOG_REQUESTS: base.LOG_REQUESTS ?? base.NODE_ENV !== "production",
  CORS_ALLOWED_ORIGINS_LIST: base.CORS_ALLOWED_ORIGINS.split(",")
    .map((item) => item.trim())
    .filter(Boolean)
};
