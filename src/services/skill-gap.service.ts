import "server-only";
import { prisma } from "@/lib/db";
import { getAI } from "@/lib/ai";
import { consumeUsage } from "@/services/usage.service";
import type { Prisma } from "@prisma/client";

export interface SkillGapView {
  targetTitles: string[];
  topSkills: { skill: string; demand: number; haveIt: boolean }[];
  summary: string;
  generatedAt: string;
  jobsAnalysed: number;
}

/** Count REQUIRED skill demand across jobs matching the user's target roles. */
async function skillFrequencies(desiredTitles: string[], targetCountries: string[]) {
  if (!desiredTitles.length)
    return { freqs: [] as { skill: string; count: number; slug: string }[], jobCount: 0 };

  const jobWhere: Prisma.JobWhereInput = {
    OR: desiredTitles.map((t) => ({
      title: { contains: t.split(" ")[0], mode: "insensitive" as const },
    })),
    ...(targetCountries.length ? { country: { in: targetCountries } } : {}),
  };
  const [rows, jobCount] = await Promise.all([
    prisma.jobSkill.groupBy({
      by: ["skillId"],
      where: { importance: "REQUIRED", job: jobWhere },
      _count: { skillId: true },
      orderBy: { _count: { skillId: "desc" } },
      take: 20,
    }),
    prisma.job.count({ where: jobWhere }),
  ]);
  const skills = await prisma.skill.findMany({
    where: { id: { in: rows.map((r) => r.skillId) } },
    select: { id: true, slug: true, name: true },
  });
  const byId = new Map(skills.map((s) => [s.id, s]));
  return {
    jobCount,
    freqs: rows
      .map((r) => {
        const s = byId.get(r.skillId);
        return s ? { skill: s.name, slug: s.slug, count: r._count.skillId } : null;
      })
      .filter((x): x is { skill: string; slug: string; count: number } => Boolean(x)),
  };
}

export async function generateSkillGapReport(userId: string): Promise<SkillGapView> {
  await consumeUsage(userId, "SKILL_GAP");

  const [profile, userSkills] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.userSkill.findMany({ where: { userId }, include: { skill: true } }),
  ]);
  const desiredTitles = profile?.desiredTitles ?? [];
  const haveSlugs = new Set(userSkills.map((u) => u.skill.slug));
  const haveNames = userSkills.map((u) => u.skill.name);

  const { freqs, jobCount } = await skillFrequencies(desiredTitles, profile?.targetCountries ?? []);

  const { data } = await getAI({ userId }).skillGapAnalysis(
    desiredTitles,
    freqs.map((f) => ({ skill: f.skill, count: f.count })),
    haveNames,
  );

  // Prefer deterministic haveIt from the user's actual skills.
  const topSkills = data.topSkills.map((s) => {
    const match = freqs.find((f) => f.skill.toLowerCase() === s.skill.toLowerCase());
    return {
      skill: s.skill,
      demand: s.demand,
      haveIt: match ? haveSlugs.has(match.slug) : s.haveIt,
    };
  });

  const report = await prisma.skillGapReport.create({
    data: {
      userId,
      targetTitles: desiredTitles,
      topSkills: topSkills as unknown as Prisma.InputJsonValue,
      summary: data.summary,
    },
  });

  return {
    targetTitles: desiredTitles,
    topSkills,
    summary: data.summary,
    generatedAt: report.generatedAt.toISOString(),
    jobsAnalysed: jobCount,
  };
}

export async function getLatestSkillGapReport(userId: string): Promise<SkillGapView | null> {
  const report = await prisma.skillGapReport.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
  });
  if (!report) return null;
  return {
    targetTitles: report.targetTitles,
    topSkills: report.topSkills as unknown as SkillGapView["topSkills"],
    summary: report.summary ?? "",
    generatedAt: report.generatedAt.toISOString(),
    jobsAnalysed: 0,
  };
}
