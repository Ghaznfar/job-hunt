import { describe, it, expect } from "vitest";
import {
  normalizeToken,
  resolveSkill,
  extractSkills,
  parseSkillList,
} from "@/lib/skills/normalize";

describe("normalizeToken", () => {
  it("lowercases and collapses whitespace/punctuation", () => {
    expect(normalizeToken("  Kubernetes (K8s) ")).toBe("kubernetes k8s");
    expect(normalizeToken("CI/CD")).toBe("ci cd");
  });
});

describe("resolveSkill", () => {
  it("resolves canonical names", () => {
    expect(resolveSkill("Kubernetes")?.slug).toBe("kubernetes");
    expect(resolveSkill("PostgreSQL")?.slug).toBe("postgresql");
  });

  it("resolves aliases", () => {
    expect(resolveSkill("k8s")?.slug).toBe("kubernetes");
    expect(resolveSkill("golang")?.slug).toBe("go");
    expect(resolveSkill("amazon web services")?.slug).toBe("aws");
    expect(resolveSkill("postgres")?.slug).toBe("postgresql");
  });

  it("resolves skills embedded in a phrase", () => {
    expect(resolveSkill("strong experience with Terraform")?.slug).toBe("terraform");
  });

  it("returns null for unknown skills", () => {
    expect(resolveSkill("underwater basket weaving")).toBeNull();
    expect(resolveSkill("")).toBeNull();
  });
});

describe("extractSkills", () => {
  it("pulls known skills out of a job description", () => {
    const text =
      "We are looking for a DevOps Engineer with AWS, Docker and Kubernetes experience. " +
      "Terraform and CI/CD pipelines (GitHub Actions) required. Nice to have: Python.";
    const slugs = extractSkills(text)
      .map((s) => s.slug)
      .sort();
    expect(slugs).toContain("aws");
    expect(slugs).toContain("docker");
    expect(slugs).toContain("kubernetes");
    expect(slugs).toContain("terraform");
    expect(slugs).toContain("github-actions");
    expect(slugs).toContain("python");
  });

  it("does not match substrings inside unrelated words", () => {
    // "go" must not match inside "goal" / "algorithm"
    const slugs = extractSkills("Our goal is a great algorithm and good communication").map(
      (s) => s.slug,
    );
    expect(slugs).not.toContain("go");
  });

  it("returns empty for empty input", () => {
    expect(extractSkills("")).toEqual([]);
  });
});

describe("parseSkillList", () => {
  it("splits and resolves a mixed list", () => {
    const { resolved, unresolved } = parseSkillList("AWS, Kubernetes; Terraform\nFooBarBaz");
    expect(resolved.map((s) => s.slug).sort()).toEqual(["aws", "kubernetes", "terraform"]);
    expect(unresolved).toEqual(["FooBarBaz"]);
  });

  it("dedupes skills that map to the same canonical slug", () => {
    const { resolved } = parseSkillList("k8s, kubernetes, Kube");
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.slug).toBe("kubernetes");
  });
});
