import { describe, it, expect } from "vitest";
import {
  normalizeCountry,
  normalizeArrangement,
  detectYears,
  detectSeniority,
  fingerprintJob,
  normalizeJob,
} from "@/lib/jobs/normalize";
import type { RawJob } from "@/lib/jobs/types";

describe("normalizeCountry", () => {
  it("maps aliases and codes", () => {
    expect(normalizeCountry("United States")).toBe("US");
    expect(normalizeCountry(undefined, "London, UK")).toBe("GB");
    expect(normalizeCountry("gb")).toBe("GB");
    expect(normalizeCountry(undefined, "Berlin, Germany")).toBe("US"); // default fallback
  });
});

describe("normalizeArrangement", () => {
  it("classifies from hints", () => {
    expect(normalizeArrangement("Fully remote role")).toBe("REMOTE");
    expect(normalizeArrangement("Hybrid - 3 days in office")).toBe("HYBRID");
    expect(normalizeArrangement("On-site in NYC")).toBe("ONSITE");
    expect(normalizeArrangement("")).toBe("UNKNOWN");
  });
  it("prefers hybrid when both hybrid and remote appear", () => {
    expect(normalizeArrangement("remote-friendly hybrid setup")).toBe("HYBRID");
  });
});

describe("detectYears", () => {
  it("parses ranges and minimums", () => {
    expect(detectYears("We need 4-6 years of experience")).toEqual({ min: 4, max: 6 });
    expect(detectYears("8+ years required")).toEqual({ min: 8, max: null });
    expect(detectYears("no numbers here")).toEqual({ min: null, max: null });
  });
});

describe("detectSeniority", () => {
  it("reads level from title", () => {
    expect(detectSeniority("Senior DevOps Engineer", "")).toBe("senior");
    expect(detectSeniority("Staff Engineer", "")).toBe("staff");
    expect(detectSeniority("Graduate Software Engineer", "")).toBe("junior");
    expect(detectSeniority("DevOps Engineer", "")).toBe("mid");
  });
});

describe("fingerprintJob", () => {
  it("is stable across formatting and company suffixes", () => {
    const a = fingerprintJob("Acme Inc.", "Senior  DevOps Engineer", "US");
    const b = fingerprintJob("acme", "senior devops engineer", "us");
    expect(a).toBe(b);
  });
  it("differs by country", () => {
    expect(fingerprintJob("Acme", "DevOps Engineer", "US")).not.toBe(
      fingerprintJob("Acme", "DevOps Engineer", "GB"),
    );
  });
});

describe("normalizeJob", () => {
  const raw: RawJob = {
    externalId: "x1",
    title: "Senior DevOps Engineer",
    company: "Acme Ltd",
    location: "London, UK",
    description:
      "<p>We need 3-5 years experience.</p><ul><li>Strong AWS and Kubernetes required</li><li>Terraform is essential</li></ul> Nice to have: Python. This is a hybrid role.",
    url: "https://x/1",
    postedAt: "2026-08-01",
  };

  it("produces normalized fields", () => {
    const n = normalizeJob(raw);
    expect(n.country).toBe("GB");
    expect(n.salaryCurrency).toBe("GBP");
    expect(n.workArrangement).toBe("HYBRID");
    expect(n.seniorityLevel).toBe("senior");
    expect(n.minYearsRequired).toBe(3);
    expect(n.maxYearsRequired).toBe(5);
    expect(n.description).not.toContain("<p>");
  });

  it("classifies required vs preferred skills", () => {
    const n = normalizeJob(raw);
    const bySlug = Object.fromEntries(n.skillSlugs.map((s) => [s.slug, s.importance]));
    expect(bySlug["aws"]).toBe("REQUIRED");
    expect(bySlug["kubernetes"]).toBe("REQUIRED");
    expect(bySlug["terraform"]).toBe("REQUIRED");
    expect(bySlug["python"]).toBe("PREFERRED");
  });
});
