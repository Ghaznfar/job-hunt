import "server-only";
import { prisma } from "@/lib/db";

export async function getDashboardData(userId: string) {
  const [profile, userSkills] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.userSkill.findMany({ where: { userId }, select: { skill: { select: { slug: true } } } }),
  ]);
  const haveSkills = new Set(userSkills.map((u) => u.skill.slug));
  const desiredTitles = profile?.desiredTitles ?? [];
  const targetCountries = profile?.targetCountries ?? [];

  const [
    applications,
    interviews,
    offers,
    savedJobs,
    matchAgg,
    topMatches,
  ] = await Promise.all([
    prisma.application.count({ where: { userId } }),
    prisma.application.count({
      where: { userId, status: { in: ["INTERVIEW", "TECHNICAL_INTERVIEW", "FINAL_INTERVIEW"] } },
    }),
    prisma.application.count({ where: { userId, status: "OFFER" } }),
    prisma.savedJob.count({ where: { userId } }),
    prisma.jobMatch.aggregate({ where: { userId }, _avg: { overallScore: true }, _count: true }),
    prisma.jobMatch.findMany({
      where: { userId, verdict: { in: ["APPLY", "MAYBE"] } },
      orderBy: { overallScore: "desc" },
      take: 4,
      include: { job: { select: { id: true, title: true, company: true } } },
    }),
  ]);

  // Recommended jobs: prefer analyzed top matches; otherwise jobs matching desired titles.
  type Rec = {
    jobId: string;
    title: string;
    company: string;
    score: number | null;
    verdict: "APPLY" | "MAYBE" | null;
  };
  let recommended: Rec[] = topMatches.map((m) => ({
    jobId: m.job.id,
    title: m.job.title,
    company: m.job.company,
    score: m.overallScore,
    verdict: m.verdict as "APPLY" | "MAYBE",
  }));

  if (recommended.length < 4 && desiredTitles.length) {
    const titleFilters = desiredTitles.map((t) => ({
      title: { contains: t.split(" ")[0], mode: "insensitive" as const },
    }));
    const fresh = await prisma.job.findMany({
      where: {
        OR: titleFilters,
        ...(targetCountries.length ? { country: { in: targetCountries } } : {}),
        jobMatches: { none: { userId } },
      },
      orderBy: { postedAt: "desc" },
      take: 4 - recommended.length,
      select: { id: true, title: true, company: true },
    });
    recommended = [
      ...recommended,
      ...fresh.map((j) => ({ jobId: j.id, title: j.title, company: j.company, score: null, verdict: null })),
    ];
  }

  // Skill gaps: most-required skills across jobs matching the user's target roles.
  const skillGap: { name: string; count: number; have: boolean }[] = [];
  if (desiredTitles.length) {
    const rows = await prisma.jobSkill.groupBy({
      by: ["skillId"],
      where: {
        importance: "REQUIRED",
        job: {
          OR: desiredTitles.map((t) => ({
            title: { contains: t.split(" ")[0], mode: "insensitive" as const },
          })),
          ...(targetCountries.length ? { country: { in: targetCountries } } : {}),
        },
      },
      _count: { skillId: true },
      orderBy: { _count: { skillId: "desc" } },
      take: 8,
    });
    const skills = await prisma.skill.findMany({
      where: { id: { in: rows.map((r) => r.skillId) } },
      select: { id: true, slug: true, name: true },
    });
    const byId = new Map(skills.map((s) => [s.id, s]));
    for (const r of rows) {
      const s = byId.get(r.skillId);
      if (!s) continue;
      skillGap.push({ name: s.name, count: r._count.skillId, have: haveSkills.has(s.slug) });
    }
  }

  return {
    onboarded: Boolean(profile?.onboardingCompletedAt),
    stats: {
      applications,
      interviews,
      offers,
      savedJobs,
      avgMatch: matchAgg._avg.overallScore ? Math.round(matchAgg._avg.overallScore) : null,
      analyzed: matchAgg._count,
    },
    recommended: recommended.slice(0, 4),
    skillGap,
  };
}
