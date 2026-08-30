import { z } from "zod";

/**
 * Centralised, validated environment configuration.
 *
 * Only `DATABASE_URL` and `AUTH_SECRET` are strictly required to boot.
 * Everything else has a safe default so the app runs fully on mock providers
 * with zero third-party credentials.
 */

const booleanish = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1).optional(),

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: booleanish,
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  ADMIN_EMAILS: z.string().optional().default(""),

  AI_PROVIDER: z.enum(["mock", "anthropic", "openai"]).default("mock"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  AI_RULE_WEIGHT: z.coerce.number().min(0).max(1).default(0.7),
  AI_AI_WEIGHT: z.coerce.number().min(0).max(1).default(0.3),

  JOB_PROVIDERS: z.string().default("mock"),
  ADZUNA_APP_ID: z.string().optional().default(""),
  ADZUNA_APP_KEY: z.string().optional().default(""),
  CRON_SECRET: z.string().optional().default(""),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default("./.uploads"),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional().default(""),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  S3_FORCE_PATH_STYLE: booleanish,
  MAX_UPLOAD_MB: z.coerce.number().positive().default(8),

  RATELIMIT_DRIVER: z.enum(["postgres", "redis", "memory"]).default("postgres"),
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),

  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  STRIPE_PRO_PRICE_ID: z.string().optional().default(""),
  STRIPE_PORTAL_RETURN_URL: z.string().optional().default("http://localhost:3000/dashboard/settings"),

  EMAIL_DRIVER: z.enum(["console", "resend"]).default("console"),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("JobHunt <noreply@localhost>"),

  FREE_MONTHLY_JOB_MATCH: z.coerce.number().int().nonnegative().default(10),
  FREE_MONTHLY_CV_ANALYSIS: z.coerce.number().int().nonnegative().default(3),
  FREE_MONTHLY_AI_GENERATIONS: z.coerce.number().int().nonnegative().default(5),
});

export type Env = z.infer<typeof schema>;

function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

// Cache across hot reloads in dev.
const globalForEnv = globalThis as unknown as { __env?: Env };
export const env: Env = globalForEnv.__env ?? loadEnv();
if (process.env.NODE_ENV !== "production") globalForEnv.__env = env;

export const adminEmails = new Set(
  env.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export const isGoogleAuthConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const isStripeConfigured = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRO_PRICE_ID);
export const isAdzunaConfigured = Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY);
