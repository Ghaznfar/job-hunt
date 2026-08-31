import { describe, it, expect } from "vitest";
import { buildJobWhere, parseSearchParams, jobSearchSchema } from "@/features/jobs/search";

describe("jobSearchSchema", () => {
  it("applies defaults", () => {
    const v = jobSearchSchema.parse({});
    expect(v.country).toBe("any");
    expect(v.page).toBe(1);
  });
});

describe("parseSearchParams", () => {
  it("splits comma-separated skills", () => {
    const v = parseSearchParams({ skills: "aws,kubernetes", country: "US" });
    expect(v.skills).toEqual(["aws", "kubernetes"]);
    expect(v.country).toBe("US");
  });
});

describe("buildJobWhere", () => {
  it("returns an empty filter with no params", () => {
    expect(buildJobWhere(jobSearchSchema.parse({}))).toEqual({});
  });

  it("adds country and arrangement filters", () => {
    const where = buildJobWhere(jobSearchSchema.parse({ country: "GB", remote: "REMOTE" }));
    expect(JSON.stringify(where)).toContain('"country":"GB"');
    expect(JSON.stringify(where)).toContain('"workArrangement":"REMOTE"');
  });

  it("requires ALL selected skills (AND semantics)", () => {
    const where = buildJobWhere(jobSearchSchema.parse({ skills: ["aws", "terraform"] }));
    const s = JSON.stringify(where);
    expect(s).toContain('"slug":"aws"');
    expect(s).toContain('"slug":"terraform"');
    // two separate jobSkills.some conditions
    expect((s.match(/jobSkills/g) ?? []).length).toBe(2);
  });

  it("adds a date-posted lower bound", () => {
    const where = buildJobWhere(jobSearchSchema.parse({ datePosted: "7" }));
    expect(JSON.stringify(where)).toContain("postedAt");
  });

  it("builds an experience-band overlap clause", () => {
    const where = buildJobWhere(jobSearchSchema.parse({ experience: "2-5" }));
    expect(JSON.stringify(where)).toContain("minYearsRequired");
  });
});
