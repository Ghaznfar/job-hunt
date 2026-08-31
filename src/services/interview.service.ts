import "server-only";
import { prisma } from "@/lib/db";
import { getAI } from "@/lib/ai";
import { consumeUsage } from "@/services/usage.service";
import type { InterviewQuestionCategory } from "@prisma/client";

const CATEGORY_MAP: Record<keyof AIQuestions, InterviewQuestionCategory> = {
  technical: "TECHNICAL",
  scenario: "SCENARIO",
  behavioral: "BEHAVIORAL",
  hr: "HR",
  jobSpecific: "JOB_SPECIFIC",
};
type AIQuestions = {
  technical: string[];
  scenario: string[];
  behavioral: string[];
  hr: string[];
  jobSpecific: string[];
};

export async function generateInterviewQuestions(userId: string, jobId: string) {
  await consumeUsage(userId, "INTERVIEW_PREP");

  const [job, profile, userSkills] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.userSkill.findMany({ where: { userId }, include: { skill: { select: { name: true } } } }),
  ]);
  if (!job) throw new Error("Job not found");

  const { data } = await getAI({ userId }).generateInterviewQuestions(
    {
      title: job.title,
      company: job.company,
      location: job.location ?? undefined,
      country: job.country,
      description: job.description,
      requirementsText: job.requirementsText ?? undefined,
    },
    {
      currentTitle: profile?.currentTitle ?? null,
      yearsExperience: profile?.yearsExperience ?? null,
      desiredTitles: profile?.desiredTitles ?? [],
      skills: userSkills.map((u) => u.skill.name),
      country: profile?.country ?? null,
    },
  );

  const rows: { userId: string; jobId: string; category: InterviewQuestionCategory; question: string }[] =
    [];
  for (const key of Object.keys(CATEGORY_MAP) as (keyof AIQuestions)[]) {
    for (const q of data[key] ?? []) {
      if (q?.trim()) rows.push({ userId, jobId, category: CATEGORY_MAP[key], question: q.trim() });
    }
  }

  await prisma.$transaction([
    prisma.interviewQuestion.deleteMany({ where: { userId, jobId } }),
    prisma.interviewQuestion.createMany({ data: rows }),
  ]);

  return prisma.interviewQuestion.findMany({
    where: { userId, jobId },
    orderBy: { createdAt: "asc" },
  });
}

export async function submitInterviewAnswer(userId: string, questionId: string, answer: string) {
  const question = await prisma.interviewQuestion.findFirst({
    where: { id: questionId, userId },
    include: { job: true },
  });
  if (!question) throw new Error("Question not found");

  const { data } = await getAI({ userId }).evaluateAnswer(question.question, answer, {
    title: question.job.title,
    company: question.job.company,
    country: question.job.country,
    description: question.job.description,
  });

  return prisma.interviewQuestion.update({
    where: { id: questionId },
    data: {
      userAnswer: answer,
      aiFeedback: data.feedback,
      improvedAnswer: data.improvedAnswer,
    },
  });
}

export async function getInterviewQuestions(userId: string, jobId: string) {
  return prisma.interviewQuestion.findMany({
    where: { userId, jobId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getJobsWithInterviewPrep(userId: string) {
  const grouped = await prisma.interviewQuestion.groupBy({
    by: ["jobId"],
    where: { userId },
    _count: { _all: true },
    _max: { updatedAt: true },
  });
  const jobs = await prisma.job.findMany({
    where: { id: { in: grouped.map((g) => g.jobId) } },
    select: { id: true, title: true, company: true },
  });
  const byId = new Map(jobs.map((j) => [j.id, j]));
  return grouped
    .map((g) => ({
      job: byId.get(g.jobId)!,
      count: g._count._all,
      answered: 0,
      updatedAt: g._max.updatedAt,
    }))
    .filter((x) => x.job)
    .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
}
