import { describe, it, expect } from "vitest";
import { computeApplicationStats } from "@/features/applications/stats";

describe("computeApplicationStats", () => {
  it("counts totals, interviews, offers and rejections by current status", () => {
    const s = computeApplicationStats({
      statuses: ["SAVED", "APPLIED", "INTERVIEW", "TECHNICAL_INTERVIEW", "OFFER", "REJECTED"],
      everHeld: [
        ["SAVED"],
        ["SAVED", "APPLIED"],
        ["APPLIED", "SCREENING", "INTERVIEW"],
        ["APPLIED", "SCREENING", "INTERVIEW", "TECHNICAL_INTERVIEW"],
        ["APPLIED", "SCREENING", "OFFER"],
        ["APPLIED", "REJECTED"],
      ],
    });
    expect(s.total).toBe(6);
    expect(s.interviews).toBe(2); // INTERVIEW + TECHNICAL_INTERVIEW current
    expect(s.offers).toBe(1);
    expect(s.rejected).toBe(1);
  });

  it("response rate = responded / applied-or-beyond", () => {
    const s = computeApplicationStats({
      statuses: ["APPLIED", "APPLIED", "SCREENING", "REJECTED"],
      everHeld: [
        ["APPLIED"], // applied, no response
        ["APPLIED"], // applied, no response
        ["APPLIED", "SCREENING"], // responded
        ["APPLIED", "REJECTED"], // responded (rejection is a response)
      ],
    });
    expect(s.applied).toBe(4);
    expect(s.responseRate).toBe(50);
  });

  it("is 0% response rate when nothing has been applied", () => {
    const s = computeApplicationStats({
      statuses: ["SAVED", "SAVED"],
      everHeld: [["SAVED"], ["SAVED"]],
    });
    expect(s.applied).toBe(0);
    expect(s.responseRate).toBe(0);
  });

  it("counts an application that was applied then withdrawn as applied", () => {
    const s = computeApplicationStats({
      statuses: ["WITHDRAWN"],
      everHeld: [["SAVED", "APPLIED", "WITHDRAWN"]],
    });
    expect(s.applied).toBe(1);
    expect(s.responseRate).toBe(0);
  });
});
