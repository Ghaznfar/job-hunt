import { describe, it, expect } from "vitest";
import { profileSchema, skillsSchema } from "@/features/profile/schema";

const base = {
  name: "Jane Doe",
  country: "GB",
  targetCountries: ["US", "GB"],
  desiredTitles: ["DevOps Engineer"],
};

describe("profileSchema", () => {
  it("accepts a minimal valid profile", () => {
    const res = profileSchema.safeParse(base);
    expect(res.success).toBe(true);
  });

  it("requires a name and country", () => {
    expect(profileSchema.safeParse({ ...base, name: "" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, country: "" }).success).toBe(false);
  });

  it("coerces numeric fields", () => {
    const res = profileSchema.parse({
      ...base,
      yearsExperience: "3",
      salaryExpectation: "90000",
    });
    expect(res.yearsExperience).toBe(3);
    expect(res.salaryExpectation).toBe(90000);
  });

  it("rejects invalid URLs but accepts empty", () => {
    expect(profileSchema.safeParse({ ...base, linkedinUrl: "not-a-url" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, linkedinUrl: "" }).success).toBe(true);
    expect(
      profileSchema.safeParse({ ...base, linkedinUrl: "https://linkedin.com/in/jane" }).success,
    ).toBe(true);
  });

  it("rejects an out-of-range experience", () => {
    expect(profileSchema.safeParse({ ...base, yearsExperience: "80" }).success).toBe(false);
  });

  it("validates work authorization enum values", () => {
    expect(profileSchema.safeParse({ ...base, workAuthUS: "CITIZEN" }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, workAuthUS: "BOGUS" }).success).toBe(false);
  });
});

describe("skillsSchema", () => {
  it("defaults to empty arrays", () => {
    const res = skillsSchema.parse({});
    expect(res.skillSlugs).toEqual([]);
    expect(res.customSkills).toEqual([]);
  });

  it("caps custom skill length", () => {
    const long = "x".repeat(60);
    expect(skillsSchema.safeParse({ customSkills: [long] }).success).toBe(false);
  });
});
