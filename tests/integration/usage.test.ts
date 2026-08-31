import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { testDb, resetDb, disconnectDb } from "../helpers/db";
import {
  consumeUsage,
  getUsageStatus,
  UsageLimitError,
  FeatureLockedError,
} from "@/services/usage.service";

let freeUser: string;
let proUser: string;

beforeAll(async () => {
  await resetDb();
});
afterAll(async () => {
  await resetDb();
  await disconnectDb();
});
beforeEach(async () => {
  await testDb.user.deleteMany();
  const f = await testDb.user.create({
    data: { email: "free@example.com", subscription: { create: { plan: "FREE", status: "ACTIVE" } } },
  });
  const p = await testDb.user.create({
    data: { email: "pro@example.com", subscription: { create: { plan: "PRO", status: "ACTIVE" } } },
  });
  freeUser = f.id;
  proUser = p.id;
});

describe("usage metering", () => {
  it("locks Pro-only features for free users", async () => {
    await expect(consumeUsage(freeUser, "CV_TAILOR")).rejects.toBeInstanceOf(FeatureLockedError);
    await expect(consumeUsage(freeUser, "COVER_LETTER")).rejects.toBeInstanceOf(FeatureLockedError);
  });

  it("allows Pro users to use Pro features", async () => {
    const status = await consumeUsage(proUser, "CV_TAILOR");
    expect(status.used).toBe(1);
    expect(status.locked).toBe(false);
  });

  it("enforces the monthly limit and does not over-count on rejection", async () => {
    const { limit } = await getUsageStatus(freeUser, "CV_ANALYSIS");
    for (let i = 0; i < limit; i++) {
      const s = await consumeUsage(freeUser, "CV_ANALYSIS");
      expect(s.used).toBe(i + 1);
    }
    await expect(consumeUsage(freeUser, "CV_ANALYSIS")).rejects.toBeInstanceOf(UsageLimitError);

    const after = await getUsageStatus(freeUser, "CV_ANALYSIS");
    expect(after.used).toBe(limit); // the failed attempt was rolled back
    expect(after.remaining).toBe(0);
  });

  it("counts are isolated per user", async () => {
    await consumeUsage(freeUser, "JOB_MATCH");
    const other = await getUsageStatus(proUser, "JOB_MATCH");
    expect(other.used).toBe(0);
  });
});
