import { describe, it, expect } from "vitest";
import { detectIntroducedSkills, screenTailorChange } from "@/lib/ai/fabrication";

const allowed = new Set(["docker", "aws"]);

describe("detectIntroducedSkills", () => {
  it("flags a skill the improved text adds that isn't allowed or in the original", () => {
    const introduced = detectIntroducedSkills(
      "Built and deployed services with Docker",
      "Built and deployed services with Docker and Kubernetes",
      allowed,
    );
    expect(introduced).toContain("Kubernetes");
  });

  it("does not flag skills that were already in the original text", () => {
    const introduced = detectIntroducedSkills(
      "Managed Kubernetes clusters",
      "Operated and scaled Kubernetes clusters in production",
      allowed,
    );
    expect(introduced).toEqual([]);
  });

  it("does not flag skills in the allowed set", () => {
    const introduced = detectIntroducedSkills(
      "Worked on the platform",
      "Worked on the AWS platform using Docker",
      allowed,
    );
    expect(introduced).toEqual([]);
  });
});

describe("screenTailorChange", () => {
  it("returns flagged with a reason for fabricated skills", () => {
    const r = screenTailorChange("Did infra work", "Did infra work with Terraform", allowed);
    expect(r.flagged).toBe(true);
    expect(r.flagReason).toMatch(/Terraform/);
  });
  it("returns not flagged for safe rewrites", () => {
    const r = screenTailorChange(
      "Responsible for CI pipelines",
      "Owned and improved CI pipelines, cutting build time",
      allowed,
    );
    expect(r.flagged).toBe(false);
  });
});
