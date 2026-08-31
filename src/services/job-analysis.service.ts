import "server-only";
import { prisma } from "@/lib/db";
import { getAI } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { resolveSkill } from "@/lib/skills/normalize";
import type { Job } from "@prisma/client";

const STALE_MS = 1000 * 60 * 60 * 24 * 14; // re-analyze after 14 days

/**
 * Enrich a job with AI-extracted requirements (years, seniority, work
 * authorization, sponsorship) the first time it's viewed. Cheap fields already
 * came from the deterministic normalizer; this fills the harder ones.
 * Never throws — a failed analysis just leaves the job in its current state.
 */
export async function ensureJobAnalyzed(jobId: string): Promise<Job | null> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return null;
  if (job.analyzedAt && Date.now() - job.analyzedAt.getTime() < STALE_MS) return job;

  try {
    const { data } = await getAI().analyzeJob({
      title: job.title,
      company: job.company,
      location: job.location ?? undefined,
      country: job.country,
      description: job.description,
      requirementsText: job.requirementsText ?? undefined,
    });

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        minYearsRequired: job.minYearsRequired ?? data.minYears ?? null,
        maxYearsRequired: job.maxYearsRequired ?? data.maxYears ?? null,
        seniorityLevel:
          job.seniorityLevel && job.seniorityLevel !== "mid"
            ? job.seniorityLevel
            : data.seniorityLevel === "unknown"
              ? job.seniorityLevel
              : data.seniorityLevel,
        workArrangement:
          job.workArrangement === "UNKNOWN" ? data.workArrangement : job.workArrangement,
        requiresWorkAuthorization:
          job.requiresWorkAuthorization.length ? job.requiresWorkAuthorization : data.requiresWorkAuthorization,
        sponsorshipAvailable:
          job.sponsorshipAvailable === "UNKNOWN" ? data.sponsorshipAvailable : job.sponsorshipAvailable,
        extractionConfidence: data.confidence,
        analyzedAt: new Date(),
      },
    });

    // Add any AI-found skills that the rule extractor missed.
    const known = new Set(
      (await prisma.jobSkill.findMany({ where: { jobId }, select: { skill: { select: { slug: true } } } })).map(
        (r) => r.skill.slug,
      ),
    );
    const extra = [...data.requiredSkills, ...data.preferredSkills]
      .map((name) => ({ name, canonical: resolveSkill(name) }))
      .filter((s) => s.canonical && !known.has(s.canonical.slug));
    for (const s of extra) {
      const skill = await prisma.skill.findUnique({ where: { slug: s.canonical!.slug }, select: { id: true } });
      if (!skill) continue;
      await prisma.jobSkill
        .create({
          data: {
            jobId,
            skillId: skill.id,
            importance: data.requiredSkills.includes(s.name) ? "REQUIRED" : "PREFERRED",
            extractedBy: "AI",
          },
        })
        .catch(() => undefined);
    }

    return updated;
  } catch (err) {
    logger.warn({ err: String(err), jobId }, "job analysis failed");
    return job;
  }
}
