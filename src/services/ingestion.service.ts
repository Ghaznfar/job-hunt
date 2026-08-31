import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getJobProviders } from "@/lib/jobs/provider";
import { normalizeJob } from "@/lib/jobs/normalize";
import type { NormalizedJob } from "@/lib/jobs/types";

export interface IngestionResult {
  provider: string;
  fetched: number;
  created: number;
  updated: number;
  duplicates: number;
  errors: number;
}

async function ensureSource(key: string) {
  return prisma.jobSource.upsert({
    where: { key },
    update: {},
    create: { key, name: key, enabled: true },
  });
}

/** Map canonical skill slugs to Skill ids, creating any missing catalogue rows. */
async function skillIdMap(slugs: string[]): Promise<Map<string, string>> {
  if (!slugs.length) return new Map();
  const { SKILL_BY_SLUG } = await import("@/lib/skills/taxonomy");
  await prisma.$transaction(
    [...new Set(slugs)].map((slug) => {
      const meta = SKILL_BY_SLUG.get(slug);
      return prisma.skill.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          name: meta?.name ?? slug,
          category: meta?.category ?? "other",
          aliases: meta?.aliases ?? [],
        },
      });
    }),
  );
  const rows = await prisma.skill.findMany({
    where: { slug: { in: [...new Set(slugs)] } },
    select: { id: true, slug: true },
  });
  return new Map(rows.map((r) => [r.slug, r.id]));
}

async function upsertJob(
  sourceId: string,
  job: NormalizedJob,
  skillIds: Map<string, string>,
): Promise<"created" | "updated" | "duplicate"> {
  // Cross-provider dedupe: if another source already has this fingerprint, skip.
  const dup = await prisma.job.findFirst({
    where: { fingerprint: job.fingerprint, source: { id: { not: sourceId } } },
    select: { id: true },
  });
  if (dup) return "duplicate";

  const existing = await prisma.job.findUnique({
    where: { sourceId_externalId: { sourceId, externalId: job.externalId } },
    select: { id: true },
  });

  const data = {
    title: job.title,
    company: job.company,
    companyDomain: job.companyDomain,
    location: job.location,
    country: job.country,
    workArrangement: job.workArrangement,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    description: job.description,
    requirementsText: job.requirementsText,
    seniorityLevel: job.seniorityLevel,
    minYearsRequired: job.minYearsRequired,
    maxYearsRequired: job.maxYearsRequired,
    url: job.url,
    postedAt: job.postedAt,
    fingerprint: job.fingerprint,
  };

  const record = existing
    ? await prisma.job.update({ where: { id: existing.id }, data })
    : await prisma.job.create({ data: { ...data, sourceId, externalId: job.externalId } });

  // Sync skills.
  await prisma.jobSkill.deleteMany({ where: { jobId: record.id } });
  const rows = job.skillSlugs
    .map((s) => ({
      jobId: record.id,
      skillId: skillIds.get(s.slug)!,
      importance: s.importance,
      extractedBy: "RULE" as const,
    }))
    .filter((r) => r.skillId);
  if (rows.length) await prisma.jobSkill.createMany({ data: rows, skipDuplicates: true });

  return existing ? "updated" : "created";
}

export async function runIngestion(opts?: {
  limitPerProvider?: number;
}): Promise<IngestionResult[]> {
  const providers = getJobProviders();
  const results: IngestionResult[] = [];

  for (const provider of providers) {
    const source = await ensureSource(provider.key);
    const result: IngestionResult = {
      provider: provider.key,
      fetched: 0,
      created: 0,
      updated: 0,
      duplicates: 0,
      errors: 0,
    };
    try {
      const raw = await provider.fetch({ limit: opts?.limitPerProvider ?? 100 });
      result.fetched = raw.length;
      const normalized = raw.map(normalizeJob);
      const allSlugs = normalized.flatMap((n) => n.skillSlugs.map((s) => s.slug));
      const ids = await skillIdMap(allSlugs);

      for (const job of normalized) {
        try {
          const outcome = await upsertJob(source.id, job, ids);
          result[
            outcome === "created" ? "created" : outcome === "updated" ? "updated" : "duplicates"
          ]++;
        } catch (err) {
          result.errors++;
          logger.error({ err: String(err), externalId: job.externalId }, "job upsert failed");
        }
      }
      await prisma.jobSource.update({ where: { id: source.id }, data: { lastRunAt: new Date() } });
    } catch (err) {
      result.errors++;
      logger.error({ err: String(err), provider: provider.key }, "ingestion provider failed");
      await prisma.errorLog.create({
        data: {
          level: "ERROR",
          source: "ingestion",
          message: `Provider ${provider.key} failed`,
          context: { error: String(err) },
        },
      });
    }
    results.push(result);
    logger.info(result, "ingestion batch complete");
  }
  return results;
}
