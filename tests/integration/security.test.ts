import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { testDb, resetDb, disconnectDb } from "../helpers/db";
import { getResumeDetail, createBlankResume } from "@/services/resume.service";
import { getMatch } from "@/services/matching.service";
import { getApplication, createApplication } from "@/services/application.service";
import { updateCoverLetter, getCoverLettersForUser } from "@/services/cover-letter.service";
import { getInterviewQuestions } from "@/services/interview.service";

let alice: string;
let bob: string;
let jobId: string;

beforeAll(async () => {
  await resetDb();
  const src = await testDb.jobSource.upsert({
    where: { key: "sec" },
    update: {},
    create: { key: "sec", name: "sec" },
  });
  const job = await testDb.job.create({
    data: {
      sourceId: src.id,
      externalId: "sec-1",
      title: "Engineer",
      company: "Acme",
      country: "US",
      description: "d",
      url: "u",
      fingerprint: "fp-sec-1",
      sponsorshipAvailable: "UNKNOWN",
    },
  });
  jobId = job.id;
});
afterAll(async () => {
  await resetDb();
  await testDb.jobSource.deleteMany();
  await disconnectDb();
});
beforeEach(async () => {
  await testDb.user.deleteMany();
  const a = await testDb.user.create({ data: { email: "alice@example.com" } });
  const b = await testDb.user.create({ data: { email: "bob@example.com" } });
  alice = a.id;
  bob = b.id;
});

describe("user data isolation", () => {
  it("Bob cannot read Alice's resume", async () => {
    const resume = await createBlankResume(alice, "Alice CV");
    expect(await getResumeDetail(alice, resume.id)).toBeTruthy();
    expect(await getResumeDetail(bob, resume.id)).toBeNull();
  });

  it("Bob cannot read Alice's job match", async () => {
    await testDb.jobMatch.create({
      data: {
        userId: alice,
        jobId,
        overallScore: 80,
        technicalScore: 80,
        experienceScore: 80,
        locationScore: 80,
        salaryScore: 80,
        seniorityScore: 80,
        eligibilityScore: 80,
        verdict: "APPLY",
        recommendation: "go",
      },
    });
    expect(await getMatch(alice, jobId)).toBeTruthy();
    expect(await getMatch(bob, jobId)).toBeNull();
  });

  it("Bob cannot read Alice's application", async () => {
    const app = await createApplication(alice, { company: "Acme", title: "Eng" });
    expect(await getApplication(alice, app!.id)).toBeTruthy();
    expect(await getApplication(bob, app!.id)).toBeNull();
  });

  it("Bob cannot edit Alice's cover letter", async () => {
    const cl = await testDb.coverLetter.create({
      data: { userId: alice, jobId, content: "Dear team", tone: "professional" },
    });
    await expect(updateCoverLetter(bob, cl.id, "hacked")).rejects.toThrow(/not found/i);
    const unchanged = await testDb.coverLetter.findUnique({ where: { id: cl.id } });
    expect(unchanged?.content).toBe("Dear team");
    expect(await getCoverLettersForUser(bob)).toHaveLength(0);
  });

  it("Bob cannot list Alice's interview questions", async () => {
    await testDb.interviewQuestion.create({
      data: { userId: alice, jobId, category: "HR", question: "Tell me about yourself" },
    });
    expect(await getInterviewQuestions(alice, jobId)).toHaveLength(1);
    expect(await getInterviewQuestions(bob, jobId)).toHaveLength(0);
  });

  it("deleting Alice cascades all her owned data", async () => {
    const resume = await createBlankResume(alice, "CV");
    await createApplication(alice, { company: "X", title: "Y" });
    await testDb.savedJob.create({ data: { userId: alice, jobId } });

    await testDb.user.delete({ where: { id: alice } });

    expect(await testDb.resume.count({ where: { id: resume.id } })).toBe(0);
    expect(await testDb.application.count({ where: { userId: alice } })).toBe(0);
    expect(await testDb.savedJob.count({ where: { userId: alice } })).toBe(0);
  });
});
