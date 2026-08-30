/**
 * Vitest automatically loads `.env`, `.env.test` and `.env.test.local` for the
 * default `test` mode, so DATABASE_URL etc. are already in `process.env` here.
 * We only force the provider abstractions into deterministic mock mode.
 */
process.env.AI_PROVIDER = "mock";
process.env.JOB_PROVIDERS = "mock";
process.env.RATELIMIT_DRIVER = process.env.RATELIMIT_DRIVER || "memory";
