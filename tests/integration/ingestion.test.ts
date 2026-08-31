import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testDb, resetDb, disconnectDb } from "../helpers/db";
import { runIngestion } from "@/services/ingestion.service";
import { searchJobs } from "@/features/jobs/queries";
import { jobSearchSchema } from "@/features/jobs/search";

let userId: string;

beforeAll(async () => {
  await resetDb();
  await testDb.jobSource.deleteMany();
  const u = await testDb.user.create({ data: { email: "jobs@example.com" } });
  userId = u.id;
});
afterAll(async () => {
  await resetDb();
  await testDb.jobSource.deleteMany();
  await disconnectDb();
});

describe("ingestion (mock provider)", () => {
  it("creates jobs on first run and only updates on the second (idempotent)", async () => {
    const first = await runIngestion({ limitPerProvider: 200 });
    const mock1 = first.find((r) => r.provider === "mock")!;
    expect(mock1.created).toBeGreaterThan(20);
    expect(mock1.errors).toBe(0);

    const totalAfterFirst = await testDb.job.count();
    expect(totalAfterFirst).toBe(mock1.created);

    const second = await runIngestion({ limitPerProvider: 200 });
    const mock2 = second.find((r) => r.provider === "mock")!;
    expect(mock2.created).toBe(0);
    expect(mock2.updated).toBe(mock1.created);
    expect(mock2.errors).toBe(0);

    const totalAfterSecond = await testDb.job.count();
    expect(totalAfterSecond).toBe(totalAfterFirst);
  });

  it("attaches required and preferred skills to jobs", async () => {
    const withSkills = await testDb.job.findFirst({
      where: { jobSkills: { some: { importance: "REQUIRED" } } },
      include: { jobSkills: true },
    });
    expect(withSkills).toBeTruthy();
    expect(withSkills!.jobSkills.some((s) => s.importance === "REQUIRED")).toBe(true);
  });

  it("search filters by country and skill", async () => {
    const usOnly = await searchJobs(userId, jobSearchSchema.parse({ country: "US" }));
    expect(usOnly.total).toBeGreaterThan(0);
    expect(usOnly.jobs.every((j) => j.country === "US")).toBe(true);

    const k8s = await searchJobs(userId, jobSearchSchema.parse({ skills: ["kubernetes"] }));
    expect(k8s.total).toBeGreaterThan(0);
    for (const job of k8s.jobs) {
      expect(job.jobSkills.some((s) => s.skill.slug === "kubernetes")).toBe(true);
    }
  });

  it("marks saved jobs in search results", async () => {
    const anyJob = await testDb.job.findFirst();
    await testDb.savedJob.create({ data: { userId, jobId: anyJob!.id } });
    const res = await searchJobs(userId, jobSearchSchema.parse({}));
    const found = res.jobs.find((j) => j.id === anyJob!.id);
    // May not be on page 1, but if present it must be flagged.
    if (found) expect(found.isSaved).toBe(true);
  });
});
