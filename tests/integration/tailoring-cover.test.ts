import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { testDb, resetDb, disconnectDb } from "../helpers/db";
import { SKILL_TAXONOMY } from "@/lib/skills/taxonomy";
import { generateTailoring, applyTailoring } from "@/services/tailoring.service";
import { generateCoverLetter } from "@/services/cover-letter.service";

let userId: string;
let resumeId: string;
let jobId: string;

beforeAll(async () => {
  await resetDb();
  for (const s of SKILL_TAXONOMY) {
    await testDb.skill.upsert({
      where: { slug: s.slug },
      update: {},
      create: { slug: s.slug, name: s.name, category: s.category, aliases: s.aliases },
    });
  }
  const source = await testDb.jobSource.upsert({
    where: { key: "test" },
    update: {},
    create: { key: "test", name: "test" },
  });
  const job = await testDb.job.create({
    data: {
      sourceId: source.id,
      externalId: "t-1",
      title: "DevOps Engineer",
      company: "Acme",
      country: "GB",
      description:
        "We need strong AWS, Docker and Kubernetes experience. Terraform and CI/CD required.",
      url: "https://x/1",
      fingerprint: "fp-tailor-1",
      sponsorshipAvailable: "UNKNOWN",
    },
  });
  jobId = job.id;

  const user = await testDb.user.create({
    data: {
      email: "tc@example.com",
      subscription: { create: { plan: "PRO", status: "ACTIVE" } },
      profile: { create: { currentTitle: "DevOps Engineer", yearsExperience: 3, onboardingCompletedAt: new Date() } },
    },
  });
  userId = user.id;

  const docker = await testDb.skill.findUnique({ where: { slug: "docker" } });
  const aws = await testDb.skill.findUnique({ where: { slug: "aws" } });
  await testDb.userSkill.createMany({
    data: [
      { userId, skillId: docker!.id },
      { userId, skillId: aws!.id },
    ],
  });

  const resume = await testDb.resume.create({
    data: {
      userId,
      name: "CV",
      isDefault: true,
      versions: {
        create: {
          label: "v1",
          isCurrent: true,
          summary: "DevOps engineer with Docker and AWS experience.",
          experiences: {
            create: {
              company: "Acme",
              title: "DevOps Engineer",
              current: true,
              bullets: ["Worked on CI pipelines and container builds"],
              techs: ["Docker"],
              sortOrder: 0,
            },
          },
          resumeSkills: { create: [{ skillId: docker!.id }, { skillId: aws!.id }] },
        },
      },
    },
    include: { versions: true },
  });
  resumeId = resume.id;
});

afterAll(async () => {
  await resetDb();
  await testDb.jobSource.deleteMany();
  await disconnectDb();
});

describe("CV tailoring", () => {
  it("produces a diff of changes without fabricating skills, and meters CV_TAILOR", async () => {
    const preview = await generateTailoring(userId, resumeId, jobId);
    expect(preview.changes.length).toBeGreaterThan(0);

    // The job wants Kubernetes/Terraform which the user lacks — no accepted-by-default
    // change may introduce them.
    for (const c of preview.changes) {
      if (!c.flagged) {
        expect(c.improved.toLowerCase()).not.toMatch(/kubernetes|terraform/);
      }
    }
    // skillsToHighlight is restricted to skills the user actually has.
    for (const s of preview.skillsToHighlight) {
      expect(["docker", "aws"]).toContain(s.toLowerCase());
    }

    const usage = await testDb.usageCounter.findFirst({ where: { userId, feature: "CV_TAILOR" } });
    expect(usage?.count).toBeGreaterThanOrEqual(1);
  });

  it("apply creates a new TAILORED version and leaves the original current pointer intact", async () => {
    const preview = await generateTailoring(userId, resumeId, jobId);
    const safe = preview.changes.filter((c) => !c.flagged).slice(0, 1);
    expect(safe.length).toBeGreaterThan(0);

    const before = await testDb.resumeVersion.findFirst({
      where: { resumeId, isCurrent: true },
      select: { id: true },
    });
    const created = await applyTailoring(
      userId,
      resumeId,
      jobId,
      safe.map((c) => ({ original: c.original, improved: c.improved })),
    );
    expect(created.source).toBe("TAILORED");
    expect(created.tailoredForJobId).toBe(jobId);
    expect(created.isCurrent).toBe(false);

    const stillCurrent = await testDb.resumeVersion.findFirst({
      where: { resumeId, isCurrent: true },
      select: { id: true },
    });
    expect(stillCurrent?.id).toBe(before?.id);
  });

  it("rejects tailoring another user's resume", async () => {
    const other = await testDb.user.create({ data: { email: "other-tc@example.com" } });
    await expect(generateTailoring(other.id, resumeId, jobId)).rejects.toThrow();
  });
});

describe("cover letters", () => {
  it("generates a letter tied to the job and meters COVER_LETTER", async () => {
    const { coverLetter } = await generateCoverLetter(userId, jobId, "professional");
    expect(coverLetter.content.length).toBeGreaterThan(50);
    expect(coverLetter.jobId).toBe(jobId);
    expect(coverLetter.content).toContain("Acme");

    const usage = await testDb.usageCounter.findFirst({ where: { userId, feature: "COVER_LETTER" } });
    expect(usage?.count).toBeGreaterThanOrEqual(1);
  });
});
