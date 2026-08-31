import "server-only";
import { prisma } from "@/lib/db";
import { getAI } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { consumeUsage } from "@/services/usage.service";
import { versionToStructured, createVersion } from "@/services/resume.service";
import { extractSkills } from "@/lib/skills/normalize";
import { screenTailorChange } from "@/lib/ai/fabrication";
import type { StructuredResume } from "@/lib/ai/types";

export interface TailorChangeView {
  id: number;
  section: string;
  location: string;
  original: string;
  improved: string;
  reason: string;
  /** True when `improved` introduces a skill not in the candidate's allowed set. */
  flagged: boolean;
  flagReason?: string;
}

export interface TailoringPreview {
  resumeId: string;
  versionId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  changes: TailorChangeView[];
  skillsToHighlight: string[];
  overallNote: string;
}

async function loadCurrentVersion(userId: string, resumeId: string) {
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1,
        include: {
          experiences: { orderBy: { sortOrder: "asc" } },
          educations: { orderBy: { sortOrder: "asc" } },
          certifications: { orderBy: { sortOrder: "asc" } },
          projects: { orderBy: { sortOrder: "asc" } },
          languages: { orderBy: { sortOrder: "asc" } },
          resumeSkills: { include: { skill: true } },
        },
      },
    },
  });
  if (!resume || !resume.versions[0]) throw new Error("Resume version not found");
  return { resume, version: resume.versions[0] };
}

export async function generateTailoring(
  userId: string,
  resumeId: string,
  jobId: string,
): Promise<TailoringPreview> {
  await consumeUsage(userId, "CV_TAILOR");

  const [{ version }, job, userSkills] = await Promise.all([
    loadCurrentVersion(userId, resumeId),
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.userSkill.findMany({ where: { userId }, include: { skill: true } }),
  ]);
  if (!job) throw new Error("Job not found");

  const structured = versionToStructured(version);
  const allowedNames = [...new Set([...structured.skills, ...userSkills.map((u) => u.skill.name)])];
  const allowedSlugs = new Set(
    [...structured.skills, ...userSkills.map((u) => u.skill.name)]
      .flatMap((n) => extractSkills(n))
      .map((s) => s.slug),
  );

  const { data } = await getAI({ userId }).tailorResume({
    resume: structured,
    job: {
      title: job.title,
      company: job.company,
      location: job.location ?? undefined,
      country: job.country,
      description: job.description,
      requirementsText: job.requirementsText ?? undefined,
    },
    allowedSkills: allowedNames,
  });

  const changes: TailorChangeView[] = data.changes
    .filter((c) => c.original?.trim() && c.improved?.trim() && c.original !== c.improved)
    .map((c, i) => {
      const screen = screenTailorChange(c.original, c.improved, allowedSlugs);
      return {
        id: i,
        section: c.section || "General",
        location: c.location || c.section || "",
        original: c.original,
        improved: c.improved,
        reason: c.reason || "Improved wording for this role.",
        flagged: screen.flagged,
        flagReason: screen.flagReason,
      };
    });

  const flaggedCount = changes.filter((c) => c.flagged).length;
  if (flaggedCount) {
    logger.warn({ userId, jobId, flaggedCount }, "tailoring produced flagged changes");
  }

  return {
    resumeId,
    versionId: version.id,
    jobId,
    jobTitle: job.title,
    company: job.company,
    changes,
    skillsToHighlight: data.skillsToHighlight.filter((s) =>
      allowedNames.some((a) => a.toLowerCase() === s.toLowerCase()),
    ),
    overallNote: data.overallNote,
  };
}

/** Apply the accepted changes onto a copy of the current version → new TAILORED version. */
export async function applyTailoring(
  userId: string,
  resumeId: string,
  jobId: string,
  accepted: { original: string; improved: string }[],
) {
  const { version } = await loadCurrentVersion(userId, resumeId);
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { title: true } });
  const structured = versionToStructured(version);

  const next: StructuredResume = JSON.parse(JSON.stringify(structured));
  for (const change of accepted) {
    const from = change.original.trim();
    const to = change.improved.trim();
    if (next.summary.trim() === from) {
      next.summary = to;
      continue;
    }
    for (const exp of next.experience) {
      const bi = exp.bullets.findIndex((b) => b.trim() === from);
      if (bi >= 0) exp.bullets[bi] = to;
    }
    for (const proj of next.projects) {
      if (proj.description?.trim() === from) proj.description = to;
    }
  }

  const created = await createVersion(userId, resumeId, next, {
    label: `Tailored for ${job?.title ?? "role"}`.slice(0, 80),
    source: "TAILORED",
    tailoredForJobId: jobId,
    makeCurrent: false,
  });
  return created;
}

export async function getTailoredVersionsForJob(userId: string, jobId: string) {
  return prisma.resumeVersion.findMany({
    where: { tailoredForJobId: jobId, resume: { userId } },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true, resumeId: true },
  });
}
