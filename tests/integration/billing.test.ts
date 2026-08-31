import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { testDb, resetDb, disconnectDb } from "../helpers/db";
import { applySubscriptionUpdate } from "@/services/billing.service";
import { getUsageStatus, consumeUsage, FeatureLockedError } from "@/services/usage.service";

let userId: string;

beforeAll(async () => {
  await resetDb();
});
afterAll(async () => {
  await resetDb();
  await disconnectDb();
});
beforeEach(async () => {
  await testDb.user.deleteMany();
  const u = await testDb.user.create({
    data: {
      email: "bill@example.com",
      subscription: { create: { plan: "FREE", status: "ACTIVE" } },
    },
  });
  userId = u.id;
});

describe("applySubscriptionUpdate (webhook state machine)", () => {
  it("promotes to PRO on an active subscription and unlocks Pro features", async () => {
    await expect(consumeUsage(userId, "CV_TAILOR")).rejects.toBeInstanceOf(FeatureLockedError);

    const plan = await applySubscriptionUpdate(userId, {
      stripeStatus: "active",
      subscriptionId: "sub_123",
      customerId: "cus_123",
      priceId: "price_pro",
      periodEndUnix: Math.floor(Date.now() / 1000) + 2_592_000,
      cancelAtPeriodEnd: false,
    });
    expect(plan).toBe("PRO");

    const status = await getUsageStatus(userId, "CV_TAILOR");
    expect(status.plan).toBe("PRO");
    expect(status.locked).toBe(false);
  });

  it("downgrades to FREE when the subscription is canceled", async () => {
    await applySubscriptionUpdate(userId, {
      stripeStatus: "active",
      subscriptionId: "sub_123",
      customerId: "cus_123",
      priceId: "price_pro",
      periodEndUnix: Math.floor(Date.now() / 1000) + 1000,
      cancelAtPeriodEnd: false,
    });
    const plan = await applySubscriptionUpdate(userId, {
      stripeStatus: "canceled",
      subscriptionId: "sub_123",
      customerId: "cus_123",
      priceId: "price_pro",
      periodEndUnix: Math.floor(Date.now() / 1000),
      cancelAtPeriodEnd: false,
    });
    expect(plan).toBe("FREE");
    const sub = await testDb.subscription.findUnique({ where: { userId } });
    expect(sub?.plan).toBe("FREE");
    expect(sub?.status).toBe("CANCELED");
  });

  it("is idempotent — replaying the same event keeps state consistent", async () => {
    const args = {
      stripeStatus: "active",
      subscriptionId: "sub_x",
      customerId: "cus_x",
      priceId: "price_pro",
      periodEndUnix: Math.floor(Date.now() / 1000) + 1000,
      cancelAtPeriodEnd: true,
    };
    await applySubscriptionUpdate(userId, args);
    await applySubscriptionUpdate(userId, args);
    const subs = await testDb.subscription.findMany({ where: { userId } });
    expect(subs).toHaveLength(1);
    expect(subs[0].cancelAtPeriodEnd).toBe(true);
  });

  it("keeps entitlement while past_due (grace period)", async () => {
    const plan = await applySubscriptionUpdate(userId, {
      stripeStatus: "past_due",
      subscriptionId: "sub_pd",
      customerId: "cus_pd",
      priceId: "price_pro",
      periodEndUnix: Math.floor(Date.now() / 1000) + 1000,
      cancelAtPeriodEnd: false,
    });
    expect(plan).toBe("PRO");
    const status = await getUsageStatus(userId, "COVER_LETTER");
    expect(status.locked).toBe(false);
  });
});
