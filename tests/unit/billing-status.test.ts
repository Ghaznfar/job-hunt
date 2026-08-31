import { describe, it, expect } from "vitest";
import { mapStripeStatus, ACTIVE_STRIPE_STATUSES } from "@/services/billing.service";

describe("mapStripeStatus", () => {
  it("maps known Stripe statuses to our enum", () => {
    expect(mapStripeStatus("active")).toBe("ACTIVE");
    expect(mapStripeStatus("trialing")).toBe("TRIALING");
    expect(mapStripeStatus("past_due")).toBe("PAST_DUE");
    expect(mapStripeStatus("canceled")).toBe("CANCELED");
    expect(mapStripeStatus("incomplete_expired")).toBe("CANCELED");
  });
  it("falls back to INCOMPLETE for unknown statuses", () => {
    expect(mapStripeStatus("something_new")).toBe("INCOMPLETE");
  });
  it("treats active/trialing/past_due as entitled", () => {
    expect(ACTIVE_STRIPE_STATUSES).toEqual(["active", "trialing", "past_due"]);
  });
});
