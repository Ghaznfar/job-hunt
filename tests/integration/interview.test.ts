import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { testDb, resetDb, disconnectDb } from "../helpers/db";
import {
  generateInterviewQuestions,
  submitInterviewAnswer,
  getInterviewQuestions,
} from "@/services/interview.service";

let userId: string;
let jobId: string;

beforeAll(async () => {
  await resetDb();
  const source = await testDb.jobSource.upsert({
    where: { key: "test" },
    update: {},
    create: { key: "test", name: "test" },
  });
  const job = await testDb.job.create({
    data: {
      sourceId: source.id,
      externalId: "iv-1",
      title: "SRE",
      company: "Globex",
      country: "US",
      description: "Kubernetes, Prometheus, Go. On-call rotation. 5 years experience.",
      url: "https://x/iv",
      fingerprint: "fp-iv-1",
      sponsorshipAvailable: "UNKNOWN",
    },
  });
  jobId = job.id;
  const user = await testDb.user.create({
    data: {
      email: "iv@example.com",
      subscription: { create: { plan: "PRO", status: "ACTIVE" } },
      profile: {
        create: { currentTitle: "SRE", yearsExperience: 5, onboardingCompletedAt: new Date() },
      },
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await resetDb();
  await testDb.jobSource.deleteMany();
  await disconnectDb();
});

describe("interview prep", () => {
  it("generates questions across all five categories and meters usage", async () => {
    const questions = await generateInterviewQuestions(userId, jobId);
    const cats = new Set(questions.map((q) => q.category));
    expect(cats).toEqual(new Set(["TECHNICAL", "SCENARIO", "BEHAVIORAL", "HR", "JOB_SPECIFIC"]));
    expect(questions.length).toBeGreaterThanOrEqual(10);

    const usage = await testDb.usageCounter.findFirst({
      where: { userId, feature: "INTERVIEW_PREP" },
    });
    expect(usage?.count).toBe(1);
  });

  it("regenerating replaces the set rather than appending", async () => {
    const first = await generateInterviewQuestions(userId, jobId);
    const second = await generateInterviewQuestions(userId, jobId);
    const stored = await getInterviewQuestions(userId, jobId);
    expect(stored.length).toBe(second.length);
    expect(stored.some((q) => first.some((f) => f.id === q.id))).toBe(false);
  });

  it("records AI feedback and an improved answer on submit", async () => {
    const questions = await generateInterviewQuestions(userId, jobId);
    const q = questions[0];
    const updated = await submitInterviewAnswer(
      userId,
      q.id,
      "Situation: prod outage. Action: rolled back, added alerting. Result: MTTR down 60%.",
    );
    expect(updated.userAnswer).toContain("prod outage");
    expect(updated.aiFeedback).toBeTruthy();
    expect(updated.improvedAnswer).toBeTruthy();
  });

  it("won't answer another user's question", async () => {
    const other = await testDb.user.create({ data: { email: "iv-other@example.com" } });
    const questions = await getInterviewQuestions(userId, jobId);
    await expect(
      submitInterviewAnswer(other.id, questions[0].id, "some answer here"),
    ).rejects.toThrow();
  });
});
