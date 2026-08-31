import "server-only";
import { prisma } from "@/lib/db";
import { getAI } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { consumeUsage } from "@/services/usage.service";
import { ensureJobAnalyzed } from "@/services/job-analysis.service";
import { computeMatch } from "@/lib/matching/engine";
import { decideVerdict } from "@/lib/matching/decision";
import type { CandidateInput, JobInput, WorkAuthStatus } from "@/lib/matching/types";
import type { Prisma } from "@prisma/client";

async function buildCandidate(userId: string): Promise<{
  candidate: CandidateInput;
  resumeVersionId: string | null;
}> {
  const [profile, userSkills, defaultResume] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.userSkill.findMany({
      where: { userId },
      select: { skill: { select: { slug: true } } },
    }),
    prisma.resume.findFirst({
      where: { userId, isDefault: true },
      select: {
        versions: {
          where: { isCurrent: true },
          take: 1,
          select: { id: true, resumeSkills: { select: { skill: { select: { slug: true } } } } },
        },
      },
    }),
  ]);

  const resumeVersion = defaultResume?.versions[0] ?? null;
  const skillSlugs = new Set<string>([
    ...userSkills.map((u) => u.skill.slug),
    ...(resumeVersion?.resumeSkills.map((r) => r.skill.slug) ?? []),
  ]);

  const rawAuth = (profile?.workAuthorizations ?? {}) as Record<string, string>;
  const workAuthorizations: Record<string, WorkAuthStatus> = {};
  for (const [k, v] of Object.entries(rawAuth)) workAuthorizations[k] = v as WorkAuthStatus;

  return {
    resumeVersionId: resumeVersion?.id ?? null,
    candidate: {
      yearsExperience: profile?.yearsExperience ?? null,
      currentTitle: profile?.currentTitle ?? null,
      skillSlugs,
      country: profile?.country ?? null,
      targetCountries: profile?.targetCountries ?? [],
      workPreference: profile?.workPreference ?? null,
      salaryExpectation: profile?.salaryExpectation ?? null,
      salaryCurrency: profile?.salaryCurrency ?? null,
      needsSponsorship: profile?.needsSponsorship ?? false,
      workAuthorizations,
    },
  };
}

const jobInclude = {
  jobSkills: { include: { skill: { select: { slug: true, name: true } } } },
} satisfies Prisma.JobInclude;

function toJobInput(job: Prisma.JobGetPayload<{ include: typeof jobInclude }>): JobInput {
  return {
    country: job.country,
    workArrangement: job.workArrangement,
    seniorityLevel: job.seniorityLevel,
    minYearsRequired: job.minYearsRequired,
    maxYearsRequired: job.maxYearsRequired,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    requiresWorkAuthorization: job.requiresWorkAuthorization,
    sponsorshipAvailable: job.sponsorshipAvailable,
    requiredSkillSlugs: job.jobSkills
      .filter((s) => s.importance === "REQUIRED")
      .map((s) => ({ slug: s.skill.slug, name: s.skill.name })),
    preferredSkillSlugs: job.jobSkills
      .filter((s) => s.importance === "PREFERRED")
      .map((s) => ({ slug: s.skill.slug, name: s.skill.name })),
  };
}

export async function analyzeMatch(userId: string, jobId: string) {
  await consumeUsage(userId, "JOB_MATCH");
  await ensureJobAnalyzed(jobId);

  const job = await prisma.job.findUnique({ where: { id: jobId }, include: jobInclude });
  if (!job) throw new Error("Job not found");

  const { candidate, resumeVersionId } = await buildCandidate(userId);
  const rule = computeMatch(candidate, toJobInput(job));
  const decision = decideVerdict(rule);

  // AI explanation layer — cannot change the verdict or scores.
  let recommendation = buildFallbackRecommendation(decision.verdict, rule);
  let aiModel: string | null = null;
  try {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const { data, usage } = await getAI({ userId }).explainMatch({
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
        skills: [...candidate.skillSlugs],
        country: profile?.country ?? null,
      },
      scores: { overall: rule.overall, ...rule.scores },
      strongMatches: rule.strongMatches,
      missingSkills: rule.missingSkills,
      verdict: decision.verdict,
      deterministicReasons: decision.reasons,
      deterministicConcerns: decision.concerns,
    });
    if (data.recommendation.trim().length > 20) recommendation = data.recommendation.trim();
    aiModel = `${usage.provider}:${usage.model}`;
  } catch (err) {
    logger.warn({ err: String(err), jobId }, "explainMatch failed; using deterministic summary");
  }

  // resumeVersionId can be null; Postgres treats NULLs as distinct in a unique
  // index, so we can't rely on upsert() here — find-then-write instead.
  const payload = {
    overallScore: rule.overall,
    technicalScore: rule.scores.technical,
    experienceScore: rule.scores.experience,
    locationScore: rule.scores.location,
    salaryScore: rule.scores.salary,
    seniorityScore: rule.scores.seniority,
    eligibilityScore: rule.scores.eligibility,
    verdict: decision.verdict,
    reasons: decision.reasons,
    concerns: decision.concerns,
    skillScores: rule.skillScores as unknown as Prisma.InputJsonValue,
    strongMatches: rule.strongMatches,
    missingSkills: rule.missingSkills,
    recommendation,
    aiModel,
  };

  const existing = await prisma.jobMatch.findFirst({
    where: { userId, jobId, resumeVersionId },
    select: { id: true },
  });
  const saved = existing
    ? await prisma.jobMatch.update({ where: { id: existing.id }, data: payload })
    : await prisma.jobMatch.create({ data: { userId, jobId, resumeVersionId, ...payload } });

  return { match: saved, rule, decision, job };
}

function buildFallbackRecommendation(verdict: string, rule: ReturnType<typeof computeMatch>) {
  const lead =
    verdict === "APPLY"
      ? "Strong match — worth a tailored application."
      : verdict === "MAYBE"
        ? "Partial match — apply if you can address the concerns."
        : "Weak match — your time is better spent elsewhere.";
  return `${lead} Overall ${rule.overall}%: technical ${rule.scores.technical}%, experience ${rule.scores.experience}%, eligibility ${rule.scores.eligibility}%.`;
}

export async function getMatch(userId: string, jobId: string) {
  return prisma.jobMatch.findFirst({
    where: { userId, jobId },
    orderBy: { createdAt: "desc" },
    include: { job: { include: jobInclude } },
  });
}

export async function getMatchesForUser(userId: string) {
  return prisma.jobMatch.findMany({
    where: { userId },
    orderBy: [{ overallScore: "desc" }, { createdAt: "desc" }],
    include: {
      job: { select: { id: true, title: true, company: true, country: true, workArrangement: true } },
    },
  });
}

export async function getDashboardMatchStats(userId: string) {
  const matches = await prisma.jobMatch.findMany({
    where: { userId },
    select: { overallScore: true, verdict: true },
  });
  const avg =
    matches.length > 0
      ? Math.round(matches.reduce((s, m) => s + m.overallScore, 0) / matches.length)
      : null;
  return {
    count: matches.length,
    avgScore: avg,
    applyCount: matches.filter((m) => m.verdict === "APPLY").length,
  };
}
