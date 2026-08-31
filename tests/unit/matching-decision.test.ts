import { describe, it, expect } from "vitest";
import { computeMatch } from "@/lib/matching/engine";
import { decideVerdict } from "@/lib/matching/decision";
import type { CandidateInput, JobInput } from "@/lib/matching/types";

const strongCandidate: CandidateInput = {
  yearsExperience: 4,
  currentTitle: "DevOps Engineer",
  skillSlugs: new Set(["aws", "kubernetes", "terraform", "docker", "linux", "python"]),
  country: "GB",
  targetCountries: ["GB", "US"],
  workPreference: "REMOTE",
  salaryExpectation: 65000,
  salaryCurrency: "GBP",
  needsSponsorship: false,
  workAuthorizations: { GB: "CITIZEN" },
};

const goodJob: JobInput = {
  country: "GB",
  workArrangement: "REMOTE",
  seniorityLevel: "mid",
  minYearsRequired: 3,
  maxYearsRequired: 6,
  salaryMin: 60000,
  salaryMax: 80000,
  salaryCurrency: "GBP",
  requiresWorkAuthorization: [],
  sponsorshipAvailable: "UNKNOWN",
  requiredSkillSlugs: [
    { slug: "aws", name: "AWS" },
    { slug: "kubernetes", name: "Kubernetes" },
    { slug: "terraform", name: "Terraform" },
  ],
  preferredSkillSlugs: [{ slug: "python", name: "Python" }],
};

describe("decideVerdict — APPLY", () => {
  it("returns APPLY for a strong all-round match", () => {
    const rule = computeMatch(strongCandidate, goodJob);
    const d = decideVerdict(rule);
    expect(rule.overall).toBeGreaterThanOrEqual(80);
    expect(d.verdict).toBe("APPLY");
    expect(d.reasons.length).toBeGreaterThan(0);
  });
});

describe("decideVerdict — DONT_APPLY hard blockers", () => {
  it("blocks when sponsorship is required but unavailable", () => {
    const c: CandidateInput = {
      ...strongCandidate,
      country: "GB",
      needsSponsorship: true,
      workAuthorizations: { US: "NEEDS_SPONSORSHIP" },
    };
    const j: JobInput = { ...goodJob, country: "US", salaryCurrency: "USD", sponsorshipAvailable: "NO" };
    const d = decideVerdict(computeMatch(c, j));
    expect(d.verdict).toBe("DONT_APPLY");
    expect(d.concerns.join(" ")).toMatch(/sponsor/i);
  });

  it("blocks when not authorized and no sponsorship, even with perfect skills", () => {
    const c: CandidateInput = { ...strongCandidate, workAuthorizations: { US: "NONE" } };
    const j: JobInput = {
      ...goodJob,
      country: "US",
      salaryCurrency: "USD",
      sponsorshipAvailable: "NO",
      requiresWorkAuthorization: ["US"],
    };
    const rule = computeMatch(c, j);
    const d = decideVerdict(rule);
    expect(d.verdict).toBe("DONT_APPLY");
  });

  it("blocks when severely under-experienced", () => {
    const c: CandidateInput = { ...strongCandidate, yearsExperience: 1, currentTitle: "Junior Engineer" };
    const j: JobInput = { ...goodJob, minYearsRequired: 8, maxYearsRequired: 12, seniorityLevel: "staff" };
    const d = decideVerdict(computeMatch(c, j));
    expect(d.verdict).toBe("DONT_APPLY");
  });

  it("blocks an onsite role in a country the candidate can't relocate to / isn't targeting", () => {
    const c: CandidateInput = {
      ...strongCandidate,
      country: "GB",
      targetCountries: ["GB"],
      workPreference: "REMOTE",
    };
    const j: JobInput = { ...goodJob, country: "US", salaryCurrency: "USD", workArrangement: "ONSITE" };
    const d = decideVerdict(computeMatch(c, j));
    expect(d.verdict).toBe("DONT_APPLY");
  });
});

describe("decideVerdict — MAYBE", () => {
  it("returns MAYBE when one required skill is missing but the rest is strong", () => {
    const c: CandidateInput = {
      ...strongCandidate,
      skillSlugs: new Set(["aws", "terraform", "docker", "linux", "python"]), // missing kubernetes
    };
    const d = decideVerdict(computeMatch(c, goodJob));
    expect(d.verdict).toBe("MAYBE");
    expect(d.concerns.join(" ")).toMatch(/kubernetes/i);
  });

  it("cannot return APPLY while a required skill is missing", () => {
    const c: CandidateInput = {
      ...strongCandidate,
      skillSlugs: new Set(["aws", "kubernetes", "docker", "linux", "python"]), // missing terraform
    };
    const d = decideVerdict(computeMatch(c, goodJob));
    expect(d.verdict).not.toBe("APPLY");
  });

  it("downgrades APPLY to MAYBE when eligibility is uncertain", () => {
    const c: CandidateInput = { ...strongCandidate, workAuthorizations: {}, country: "GB" };
    const j: JobInput = { ...goodJob, country: "US", salaryCurrency: "USD", requiresWorkAuthorization: ["US"] };
    const d = decideVerdict(computeMatch(c, j));
    expect(["MAYBE", "DONT_APPLY"]).toContain(d.verdict);
    expect(d.verdict).not.toBe("APPLY");
  });
});

describe("decideVerdict — determinism", () => {
  it("produces identical output for identical input", () => {
    const a = decideVerdict(computeMatch(strongCandidate, goodJob));
    const b = decideVerdict(computeMatch(strongCandidate, goodJob));
    expect(a).toEqual(b);
  });

  it("never emits APPLY when overall < 55", () => {
    const c: CandidateInput = {
      ...strongCandidate,
      skillSlugs: new Set(["php"]),
      yearsExperience: 0,
    };
    const j: JobInput = { ...goodJob, minYearsRequired: 6, maxYearsRequired: 10, seniorityLevel: "senior" };
    const rule = computeMatch(c, j);
    const d = decideVerdict(rule);
    expect(rule.overall).toBeLessThan(55);
    expect(d.verdict).not.toBe("APPLY");
  });
});
