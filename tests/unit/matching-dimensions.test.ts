import { describe, it, expect } from "vitest";
import {
  scoreTechnical,
  scoreExperience,
  scoreLocation,
  scoreSalary,
  scoreSeniority,
  scoreEligibility,
} from "@/lib/matching/dimensions";
import type { CandidateInput, JobInput } from "@/lib/matching/types";

function candidate(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    yearsExperience: 4,
    currentTitle: "DevOps Engineer",
    skillSlugs: new Set(["aws", "kubernetes", "terraform", "docker", "linux"]),
    country: "GB",
    targetCountries: ["GB", "US"],
    workPreference: "REMOTE",
    salaryExpectation: 70000,
    salaryCurrency: "GBP",
    needsSponsorship: false,
    workAuthorizations: { GB: "CITIZEN" },
    ...overrides,
  };
}

function job(overrides: Partial<JobInput> = {}): JobInput {
  return {
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
    ...overrides,
  };
}

describe("scoreTechnical", () => {
  it("is 100 when all required + preferred present", () => {
    const c = candidate({ skillSlugs: new Set(["aws", "kubernetes", "terraform", "python"]) });
    const r = scoreTechnical(c, job());
    expect(r.score).toBe(100);
    expect(r.missingSkills).toEqual([]);
  });

  it("weights required skills more than preferred", () => {
    // Has all required, missing preferred -> should still be high (>= 85)
    const r = scoreTechnical(candidate(), job());
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.missingSkills).toEqual(["Python"]);
  });

  it("drops sharply when a required skill is missing", () => {
    const c = candidate({ skillSlugs: new Set(["aws", "terraform"]) }); // missing kubernetes
    const r = scoreTechnical(c, job());
    expect(r.score).toBeLessThan(70);
    expect(r.missingSkills).toContain("Kubernetes");
  });

  it("returns neutral 70 when the job lists no skills", () => {
    const r = scoreTechnical(candidate(), job({ requiredSkillSlugs: [], preferredSkillSlugs: [] }));
    expect(r.score).toBe(70);
  });
});

describe("scoreExperience", () => {
  it("is 100 inside the band", () => {
    expect(scoreExperience(candidate({ yearsExperience: 4 }), job()).score).toBe(100);
  });
  it("penalises being under the minimum", () => {
    expect(
      scoreExperience(
        candidate({ yearsExperience: 1 }),
        job({ minYearsRequired: 5, maxYearsRequired: 8 }),
      ).score,
    ).toBeLessThan(40);
  });
  it("mildly penalises being over the maximum", () => {
    const s = scoreExperience(
      candidate({ yearsExperience: 15 }),
      job({ minYearsRequired: 3, maxYearsRequired: 6 }),
    ).score;
    expect(s).toBeGreaterThanOrEqual(70);
    expect(s).toBeLessThan(100);
  });
  it("is neutral when no requirement is stated", () => {
    expect(
      scoreExperience(candidate(), job({ minYearsRequired: null, maxYearsRequired: null })).score,
    ).toBe(80);
  });
});

describe("scoreLocation", () => {
  it("remote in a target country scores 100", () => {
    expect(scoreLocation(candidate(), job({ workArrangement: "REMOTE" })).score).toBe(100);
  });
  it("onsite in another country is low", () => {
    const c = candidate({ country: "GB" });
    const j = job({ country: "US", workArrangement: "ONSITE" });
    expect(scoreLocation(c, j).score).toBeLessThan(50);
  });
  it("caps score when candidate wants remote but job is onsite", () => {
    const c = candidate({ country: "GB", workPreference: "REMOTE" });
    const j = job({ country: "GB", workArrangement: "ONSITE" });
    expect(scoreLocation(c, j).score).toBeLessThanOrEqual(45);
  });
});

describe("scoreSalary", () => {
  it("is 100 when the offer meets expectation", () => {
    expect(
      scoreSalary(candidate({ salaryExpectation: 70000 }), job({ salaryMax: 80000 })).score,
    ).toBe(100);
  });
  it("scores below when the offer is well under expectation", () => {
    expect(
      scoreSalary(
        candidate({ salaryExpectation: 120000 }),
        job({ salaryMin: 60000, salaryMax: 70000 }),
      ).score,
    ).toBeLessThan(70);
  });
  it("won't compare across currencies", () => {
    const s = scoreSalary(candidate({ salaryCurrency: "USD" }), job({ salaryCurrency: "GBP" }));
    expect(s.score).toBe(70);
    expect(s.note).toMatch(/manually/i);
  });
});

describe("scoreSeniority", () => {
  it("matches equal levels", () => {
    expect(
      scoreSeniority(candidate({ currentTitle: "DevOps Engineer" }), job({ seniorityLevel: "mid" }))
        .score,
    ).toBe(100);
  });
  it("flags a job well above the candidate level", () => {
    expect(
      scoreSeniority(
        candidate({ currentTitle: "Junior Engineer", yearsExperience: 1 }),
        job({ seniorityLevel: "principal" }),
      ).score,
    ).toBeLessThan(50);
  });
});

describe("scoreEligibility", () => {
  it("is 100 for a citizen with no auth requirement", () => {
    const r = scoreEligibility(
      candidate({ workAuthorizations: { GB: "CITIZEN" } }),
      job({ country: "GB" }),
    );
    expect(r.score).toBe(100);
    expect(r.flags.sponsorshipBlocked).toBe(false);
  });

  it("hard-blocks when sponsorship is needed but not offered", () => {
    const c = candidate({
      needsSponsorship: true,
      workAuthorizations: { US: "NEEDS_SPONSORSHIP" },
    });
    const j = job({ country: "US", sponsorshipAvailable: "NO" });
    const r = scoreEligibility(c, j);
    expect(r.score).toBeLessThan(15);
    expect(r.flags.sponsorshipBlocked).toBe(true);
  });

  it("is favourable when sponsorship is needed and offered", () => {
    const c = candidate({
      workAuthorizations: { US: "NEEDS_SPONSORSHIP" },
      needsSponsorship: true,
    });
    const j = job({ country: "US", sponsorshipAvailable: "YES" });
    expect(scoreEligibility(c, j).score).toBeGreaterThanOrEqual(70);
  });

  it("hard-blocks when not authorized and no sponsorship", () => {
    const c = candidate({ workAuthorizations: { US: "NONE" } });
    const j = job({ country: "US", sponsorshipAvailable: "NO", requiresWorkAuthorization: ["US"] });
    const r = scoreEligibility(c, j);
    expect(r.flags.notWorkAuthorized).toBe(true);
    expect(r.score).toBeLessThan(10);
  });

  it("flags uncertainty when status is unknown", () => {
    const c = candidate({ workAuthorizations: {} });
    const j = job({ country: "US" });
    const r = scoreEligibility(c, j);
    expect(r.flags.eligibilityUncertain).toBe(true);
  });
});
