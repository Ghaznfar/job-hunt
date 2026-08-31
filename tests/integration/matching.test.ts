import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { testDb, resetDb, disconnectDb } from "../helpers/db";
import { SKILL_TAXONOMY } from "@/lib/skills/taxonomy";
import { runIngestion } from "@/services/ingestion.service";
import { analyzeMatch, getMatch } from "@/services/matching.service";

let userId: string;

beforeAll(async () => {
  await resetDb();
  await testDb.jobSource.deleteMany();
  for (const s of SKILL_TAXONOMY) {
    await testDb.skill.upsert({
      where: { slug: s.slug },
      update: {},
      create: { slug: s.slug, name: s.name, category: s.category, aliases: s.aliases },
    });
  }
  await runIngestion({ limitPerProvider: 200 });

  const user = await testDb.user.create({
    data: {
      email: "match@example.com",
      subscription: { create: { plan: "FREE", status: "ACTIVE" } },
      profile: {
        create: {
          country: "GB",
          currentTitle: "DevOps Engineer",
          yearsExperience: 4,
          desiredTitles: ["DevOps Engineer"],
          targetCountries: ["GB", "US"],
          workPreference: "REMOTE",
          salaryExpectation: 65000,
          salaryCurrency: "GBP",
          workAuthorizations: { GB: "CITIZEN", US: "NEEDS_SPONSORSHIP" },
          needsSponsorship: true,
          onboardingCompletedAt: new Date(),
        },
      },
    },
  });
  userId = user.id;

  // Give the user some skills + a CV version with skills.
  const skills = await testDb.skill.findMany({
    where: { slug: { in: ["aws", "kubernetes", "terraform", "docker", "linux"] } },
  });
  await testDb.userSkill.createMany({
    data: skills.map((s) => ({ userId, skillId: s.id })),
  });
  await testDb.resume.create({
    data: {
      userId,
      name: "CV",
      isDefault: true,
      versions: {
        create: {
          label: "v1",
          isCurrent: true,
          resumeSkills: { create: skills.map((s) => ({ skillId: s.id })) },
        },
      },
    },
  });
});

afterAll(async () => {
  await resetDb();
  await testDb.jobSource.deleteMany();
  await disconnectDb();
});

describe("analyzeMatch (end to end, mock AI)", () => {
  it("persists a JobMatch with a verdict, dimension scores and recommendation", async () => {
    const gbRemote = await testDb.job.findFirst({
      where: { country: "GB", workArrangement: { in: ["REMOTE", "HYBRID"] }, title: { contains: "DevOps" } },
    });
    expect(gbRemote).toBeTruthy();

    const { match, decision } = await analyzeMatch(userId, gbRemote!.id);
    expect(match.overallScore).toBeGreaterThan(0);
    expect(["APPLY", "MAYBE", "DONT_APPLY"]).toContain(match.verdict);
    expect(match.verdict).toBe(decision.verdict);
    expect(match.recommendation.length).toBeGreaterThan(10);
    expect(match.technicalScore).toBeGreaterThan(50); // has the core DevOps skills

    const reloaded = await getMatch(userId, gbRemote!.id);
    expect(reloaded?.id).toBe(match.id);
  });

  it("re-running updates the same row rather than creating a duplicate", async () => {
    const job = await testDb.job.findFirst({ where: { country: "GB" } });
    await analyzeMatch(userId, job!.id);
    await analyzeMatch(userId, job!.id);
    const count = await testDb.jobMatch.count({ where: { userId, jobId: job!.id } });
    expect(count).toBe(1);
  });

  it("returns DONT_APPLY for a US role with no sponsorship (eligibility blocker)", async () => {
    // Find a US job whose description says sponsorship is not available.
    const usNoSponsor = await testDb.job.findFirst({
      where: { country: "US", description: { contains: "unable to provide visa sponsorship" } },
    });
    if (!usNoSponsor) return; // dataset vari, skip if not present
    const { decision } = await analyzeMatch(userId, usNoSponsor.id);
    expect(decision.verdict).toBe("DONT_APPLY");
    expect(decision.concerns.join(" ")).toMatch(/sponsor/i);
  });

  it("counts against the JOB_MATCH usage limit", async () => {
    const before = await testDb.usageCounter.findFirst({
      where: { userId, feature: "JOB_MATCH" },
    });
    const job = await testDb.job.findFirst({ where: { country: "GB" }, orderBy: { createdAt: "desc" } });
    await analyzeMatch(userId, job!.id);
    const after = await testDb.usageCounter.findFirst({ where: { userId, feature: "JOB_MATCH" } });
    expect((after?.count ?? 0)).toBeGreaterThan(before?.count ?? 0);
  });
});
