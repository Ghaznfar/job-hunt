import "server-only";
import { prisma } from "@/lib/db";
import { buildJobWhere, PAGE_SIZE, type JobSearchInput } from "./search";

export async function searchJobs(userId: string, input: JobSearchInput) {
  const where = buildJobWhere(input);
  const [total, jobs, savedRows] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      skip: (input.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        jobSkills: { include: { skill: { select: { slug: true, name: true } } } },
        source: { select: { key: true, name: true } },
      },
    }),
    prisma.savedJob.findMany({ where: { userId }, select: { jobId: true } }),
  ]);

  const saved = new Set(savedRows.map((s) => s.jobId));
  return {
    total,
    page: input.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    jobs: jobs.map((j) => ({ ...j, isSaved: saved.has(j.id) })),
  };
}

export async function getJobForUser(userId: string, jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      jobSkills: { include: { skill: { select: { slug: true, name: true, category: true } } } },
      source: { select: { key: true, name: true } },
    },
  });
  if (!job) return null;
  const [saved, application, match] = await Promise.all([
    prisma.savedJob.findUnique({ where: { userId_jobId: { userId, jobId } } }),
    prisma.application.findFirst({ where: { userId, jobId }, select: { id: true, status: true } }),
    prisma.jobMatch.findFirst({
      where: { userId, jobId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { job, isSaved: Boolean(saved), application, match };
}

export async function getSavedJobs(userId: string) {
  return prisma.savedJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      job: {
        include: { jobSkills: { include: { skill: { select: { name: true } } } } },
      },
    },
  });
}
