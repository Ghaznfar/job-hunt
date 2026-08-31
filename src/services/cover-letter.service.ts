import "server-only";
import { prisma } from "@/lib/db";
import { getAI } from "@/lib/ai";
import { consumeUsage } from "@/services/usage.service";
import { versionToStructured } from "@/services/resume.service";

export type CoverLetterTone = "professional" | "enthusiastic" | "concise" | "warm";

async function loadContext(userId: string, jobId: string) {
  const [job, profile, defaultResume] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.resume.findFirst({
      where: { userId, isDefault: true },
      include: {
        versions: {
          where: { isCurrent: true },
          take: 1,
          include: {
            experiences: { orderBy: { sortOrder: "asc" } },
            educations: true,
            certifications: true,
            projects: true,
            languages: true,
            resumeSkills: { include: { skill: true } },
          },
        },
      },
    }),
  ]);
  if (!job) throw new Error("Job not found");

  const version = defaultResume?.versions[0] ?? null;
  const structured = version ? versionToStructured(version) : null;
  const skills = new Set<string>([
    ...(structured?.skills ?? []),
  ]);

  return { job, profile, structured, version, skills: [...skills] };
}

export async function generateCoverLetter(
  userId: string,
  jobId: string,
  tone: CoverLetterTone,
) {
  await consumeUsage(userId, "COVER_LETTER");
  const { job, profile, structured, version, skills } = await loadContext(userId, jobId);

  const jobSkillNames = (
    await prisma.jobSkill.findMany({
      where: { jobId },
      include: { skill: { select: { name: true } } },
    })
  ).map((s) => s.skill.name);
  const lowerSkills = new Set(skills.map((s) => s.toLowerCase()));
  const highlights = jobSkillNames.filter((s) => lowerSkills.has(s.toLowerCase())).slice(0, 5);

  const { data, usage } = await getAI({ userId }).generateCoverLetter({
    job: {
      title: job.title,
      company: job.company,
      location: job.location ?? undefined,
      country: job.country,
      description: job.description,
      requirementsText: job.requirementsText ?? undefined,
    },
    profile: {
      currentTitle: profile?.currentTitle ?? null,
      yearsExperience: profile?.yearsExperience ?? null,
      desiredTitles: profile?.desiredTitles ?? [],
      skills,
      country: profile?.country ?? null,
    },
    resumeSummary: structured?.summary || `${profile?.currentTitle ?? "Engineer"}`,
    highlights,
    tone,
  });

  const record = await prisma.coverLetter.create({
    data: {
      userId,
      jobId,
      resumeVersionId: version?.id ?? null,
      content: data.content,
      tone,
    },
  });
  return { coverLetter: record, model: `${usage.provider}:${usage.model}` };
}

export async function updateCoverLetter(userId: string, id: string, content: string) {
  const owned = await prisma.coverLetter.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Not found");
  return prisma.coverLetter.update({ where: { id }, data: { content } });
}

export async function deleteCoverLetter(userId: string, id: string) {
  await prisma.coverLetter.deleteMany({ where: { id, userId } });
}

export async function getCoverLettersForUser(userId: string) {
  return prisma.coverLetter.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { job: { select: { id: true, title: true, company: true } } },
  });
}
