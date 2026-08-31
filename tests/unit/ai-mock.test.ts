import { describe, it, expect } from "vitest";
import { MockAIProvider } from "@/lib/ai/mock";

const ai = new MockAIProvider();

const jobText = `Senior DevOps Engineer

We need 4-6 years of experience. Must have strong AWS, Kubernetes and Terraform.
CI/CD with GitHub Actions is required. Nice to have: Python, Datadog.
This is a fully remote role. We are unable to sponsor visas; US work authorization required.`;

describe("MockAIProvider.analyzeJob", () => {
  it("extracts skills, seniority, years, arrangement and eligibility", async () => {
    const { data } = await ai.analyzeJob({
      title: "Senior DevOps Engineer",
      company: "Acme",
      country: "US",
      description: jobText,
    });
    expect(data.requiredSkills.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(["aws", "kubernetes", "terraform"]),
    );
    expect(data.seniorityLevel).toBe("senior");
    expect(data.minYears).toBe(4);
    expect(data.maxYears).toBe(6);
    expect(data.workArrangement).toBe("REMOTE");
    expect(data.sponsorshipAvailable).toBe("NO");
    expect(data.requiresWorkAuthorization).toContain("US");
  });
});

describe("MockAIProvider.structureResume", () => {
  it("pulls contact info and skills from raw text", async () => {
    const raw = `Jane Smith
jane.smith@example.com | +1 555 123 4567 | https://github.com/jsmith
DevOps engineer with 3 years across AWS and Kubernetes.

Experience
Platform Engineer — Acme Corp (2021 - Present)
- Ran EKS clusters with Terraform

Education
BSc Computer Science, University of Leeds 2020

Skills
AWS, Kubernetes, Terraform, Python`;
    const { data } = await ai.structureResume(raw);
    expect(data.email).toBe("jane.smith@example.com");
    expect(data.links[0]).toContain("github.com");
    expect(data.skills.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(["aws", "kubernetes", "terraform", "python"]),
    );
    expect(data.experience.length).toBeGreaterThan(0);
  });
});

describe("MockAIProvider.tailorResume never fabricates skills", () => {
  it("only highlights skills from the allowed list", async () => {
    const { data } = await ai.tailorResume({
      resume: {
        fullName: "",
        email: "",
        phone: "",
        location: "",
        links: [],
        summary: "Engineer",
        experience: [
          { company: "Acme", title: "Eng", location: "", startDate: "", endDate: "", current: true, bullets: ["Did work with Docker"], techs: ["Docker"] },
        ],
        education: [],
        skills: ["Docker"],
        certifications: [],
        projects: [],
        languages: [],
      },
      job: { title: "DevOps", company: "X", description: "Need AWS, Kubernetes, Docker", requirementsText: "" },
      allowedSkills: ["Docker"],
    });
    // Job wants AWS + Kubernetes but the user does not have them — must not appear.
    expect(data.skillsToHighlight).toEqual(["Docker"]);
    for (const change of data.changes) {
      expect(change.improved.toLowerCase()).not.toContain("kubernetes");
    }
  });
});

describe("MockAIProvider.evaluateAnswer", () => {
  it("scores a detailed STAR answer higher than a one-liner", async () => {
    const job = { title: "SRE", company: "X", description: "" };
    const short = await ai.evaluateAnswer("Tell me about yourself", "I do ops.", job);
    const long = await ai.evaluateAnswer(
      "Tell me about a hard incident",
      "Situation: our API returned 500s. Task: restore service. Action: I rolled back the deploy and added a circuit breaker. Result: error rate dropped from 40% to 0.2% within 15 minutes.",
      job,
    );
    expect(long.data.score!).toBeGreaterThan(short.data.score!);
  });
});
