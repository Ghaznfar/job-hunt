import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { testDb, resetDb, disconnectDb } from "../helpers/db";
import { SKILL_TAXONOMY } from "@/lib/skills/taxonomy";
import { runIngestion } from "@/services/ingestion.service";
import { generateSkillGapReport } from "@/services/skill-gap.service";

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
      email: "gap@example.com",
      subscription: { create: { plan: "PRO", status: "ACTIVE" } },
      profile: {
        create: {
          desiredTitles: ["DevOps Engineer"],
          targetCountries: ["US", "GB"],
          onboardingCompletedAt: new Date(),
        },
      },
    },
  });
  userId = user.id;
  const docker = await testDb.skill.findUnique({ where: { slug: "docker" } });
  await testDb.userSkill.create({ data: { userId, skillId: docker!.id } });
});

afterAll(async () => {
  await resetDb();
  await testDb.jobSource.deleteMany();
  await disconnectDb();
});

describe("skill gap analysis", () => {
  it("ranks in-demand skills for the target role and marks which the user has", async () => {
    const report = await generateSkillGapReport(userId);
    expect(report.targetTitles).toEqual(["DevOps Engineer"]);
    expect(report.topSkills.length).toBeGreaterThan(0);
    expect(report.jobsAnalysed).toBeGreaterThan(0);

    const docker = report.topSkills.find((s) => s.skill.toLowerCase() === "docker");
    if (docker) expect(docker.haveIt).toBe(true);

    const persisted = await testDb.skillGapReport.findFirst({ where: { userId } });
    expect(persisted).toBeTruthy();

    const usage = await testDb.usageCounter.findFirst({ where: { userId, feature: "SKILL_GAP" } });
    expect(usage?.count).toBe(1);
  });
});
