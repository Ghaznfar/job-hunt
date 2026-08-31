import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma client for integration tests. Uses whatever DATABASE_URL is in
 * the environment (loaded by vitest from .env.test).
 */
export const testDb = new PrismaClient();

/** Delete all rows created by tests. Order respects FK constraints via cascade. */
export async function resetDb() {
  // Users cascade to almost everything; wipe the roots + shared catalog leftovers.
  await testDb.$transaction([
    testDb.aIRequest.deleteMany(),
    testDb.errorLog.deleteMany(),
    testDb.auditLog.deleteMany(),
    testDb.rateLimit.deleteMany(),
    testDb.job.deleteMany(),
    testDb.user.deleteMany(),
    testDb.verificationToken.deleteMany(),
  ]);
}

export async function disconnectDb() {
  await testDb.$disconnect();
}
