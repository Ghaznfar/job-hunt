/**
 * Vitest automatically loads `.env`, `.env.test` and `.env.test.local` for the
 * default `test` mode, so DATABASE_URL etc. are already in `process.env` here.
 * We force the provider abstractions into deterministic mock mode.
 */
process.env.AI_PROVIDER = "mock";
process.env.JOB_PROVIDERS = "mock";
process.env.RATELIMIT_DRIVER = process.env.RATELIMIT_DRIVER || "memory";
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL || "silent";

// Safety net: integration tests call deleteMany() on real tables. Refuse to run
// unless the database is clearly a throwaway test database.
const dbUrl = process.env.DATABASE_URL ?? "";
if (!/test/i.test(dbUrl)) {
  throw new Error(
    `Refusing to run tests against a non-test database.\n` +
      `DATABASE_URL must contain "test" (e.g. .../jobhunt_test). Got: ${dbUrl || "<unset>"}`,
  );
}
