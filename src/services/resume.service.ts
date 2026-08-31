import "server-only";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { getAI, type StructuredResume } from "@/lib/ai";
import { validateUpload, extractText } from "@/lib/cv/parse";
import { ensureSkills } from "@/lib/skills/db";
import { consumeUsage } from "@/services/usage.service";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

const versionInclude = {
  experiences: { orderBy: { sortOrder: "asc" } },
  educations: { orderBy: { sortOrder: "asc" } },
  certifications: { orderBy: { sortOrder: "asc" } },
  projects: { orderBy: { sortOrder: "asc" } },
  languages: { orderBy: { sortOrder: "asc" } },
  resumeSkills: { include: { skill: true } },
} satisfies Prisma.ResumeVersionInclude;

export type ResumeVersionWithChildren = Prisma.ResumeVersionGetPayload<{
  include: typeof versionInclude;
}>;

/** Persist a StructuredResume as the child rows of an existing (empty) version. */
async function writeVersionContent(
  tx: Prisma.TransactionClient,
  versionId: string,
  data: StructuredResume,
) {
  await tx.resumeVersion.update({
    where: { id: versionId },
    data: { summary: data.summary || null },
  });
  if (data.experience.length) {
    await tx.experience.createMany({
      data: data.experience.map((e, i) => ({
        resumeVersionId: versionId,
        company: e.company || "—",
        title: e.title || "—",
        location: e.location || null,
        startDate: e.startDate || null,
        endDate: e.endDate || null,
        current: e.current ?? false,
        bullets: e.bullets ?? [],
        techs: e.techs ?? [],
        sortOrder: i,
      })),
    });
  }
  if (data.education.length) {
    await tx.education.createMany({
      data: data.education.map((e, i) => ({
        resumeVersionId: versionId,
        institution: e.institution || "—",
        degree: e.degree || null,
        field: e.field || null,
        startDate: e.startDate || null,
        endDate: e.endDate || null,
        grade: e.grade || null,
        sortOrder: i,
      })),
    });
  }
  if (data.certifications.length) {
    await tx.certification.createMany({
      data: data.certifications.map((c, i) => ({
        resumeVersionId: versionId,
        name: c.name,
        issuer: c.issuer || null,
        sortOrder: i,
      })),
    });
  }
  if (data.projects.length) {
    await tx.project.createMany({
      data: data.projects.map((p, i) => ({
        resumeVersionId: versionId,
        name: p.name,
        description: p.description || null,
        techs: p.techs ?? [],
        url: p.url || null,
        sortOrder: i,
      })),
    });
  }
  if (data.languages.length) {
    await tx.language.createMany({
      data: data.languages.map((l, i) => ({
        resumeVersionId: versionId,
        name: l.name,
        proficiency: l.proficiency || null,
        sortOrder: i,
      })),
    });
  }
}

async function attachSkills(versionId: string, skillLabels: string[]) {
  const resolved = await ensureSkills(skillLabels);
  if (!resolved.length) return;
  await prisma.resumeSkill.createMany({
    data: resolved.map((s) => ({ resumeVersionId: versionId, skillId: s.id })),
    skipDuplicates: true,
  });
}

export interface UploadResumeInput {
  userId: string;
  name: string;
  filename: string;
  mime: string;
  bytes: Buffer;
}

export async function createResumeFromUpload(input: UploadResumeInput) {
  const { kind } = validateUpload(input.bytes, input.mime, input.filename);

  // Meter as a CV analysis (uses the structuring AI call).
  await consumeUsage(input.userId, "CV_ANALYSIS");

  const rawText = await extractText(input.bytes, kind);
  if (rawText.replace(/\s/g, "").length < 40) {
    throw new Error(
      "We couldn't read enough text from that file. If it's a scanned PDF, upload a text-based version.",
    );
  }

  const { fileKey } = await getStorage()
    .put(input.bytes, {
      prefix: `resumes/${input.userId}`,
      filename: input.filename,
      contentType: input.mime,
    })
    .then((r) => ({ fileKey: r.key }));

  let structured: StructuredResume;
  try {
    structured = (await getAI({ userId: input.userId }).structureResume(rawText)).data;
  } catch (e) {
    logger.error({ err: String(e) }, "resume structuring failed; storing raw only");
    structured = {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      links: [],
      summary: "",
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: [],
      languages: [],
    };
  }

  const isFirst = (await prisma.resume.count({ where: { userId: input.userId } })) === 0;

  const resume = await prisma.$transaction(async (tx) => {
    const created = await tx.resume.create({
      data: {
        userId: input.userId,
        name: input.name,
        isDefault: isFirst,
        fileKey,
        fileType: kind,
        rawText,
        parsedAt: new Date(),
        versions: {
          create: { label: "Original upload", source: "UPLOAD", isCurrent: true },
        },
      },
      include: { versions: true },
    });
    await writeVersionContent(tx, created.versions[0].id, structured);
    return created;
  });

  await attachSkills(resume.versions[0].id, structured.skills);
  logger.info({ userId: input.userId, resumeId: resume.id }, "resume uploaded & parsed");
  return resume;
}

export async function createBlankResume(userId: string, name: string) {
  const isFirst = (await prisma.resume.count({ where: { userId } })) === 0;
  return prisma.resume.create({
    data: {
      userId,
      name,
      isDefault: isFirst,
      versions: { create: { label: "Draft", source: "EDIT", isCurrent: true } },
    },
    include: { versions: true },
  });
}

export async function getResumesForUser(userId: string) {
  return prisma.resume.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, label: true, source: true, isCurrent: true, createdAt: true },
      },
      _count: { select: { versions: true } },
    },
  });
}

export async function getResumeDetail(userId: string, resumeId: string) {
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        include: versionInclude,
      },
    },
  });
  return resume;
}

/** The version a user is actively editing / matching against. */
export async function getCurrentVersion(userId: string, resumeId: string) {
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
    include: { versions: { where: { isCurrent: true }, include: versionInclude, take: 1 } },
  });
  return resume?.versions[0] ?? null;
}

export async function setDefaultResume(userId: string, resumeId: string) {
  const owned = await prisma.resume.findFirst({ where: { id: resumeId, userId }, select: { id: true } });
  if (!owned) throw new Error("Not found");
  await prisma.$transaction([
    prisma.resume.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.resume.update({ where: { id: resumeId }, data: { isDefault: true } }),
  ]);
}

export async function renameResume(userId: string, resumeId: string, name: string) {
  await prisma.resume.updateMany({ where: { id: resumeId, userId }, data: { name } });
}

export async function deleteResume(userId: string, resumeId: string) {
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
    select: { id: true, fileKey: true, isDefault: true },
  });
  if (!resume) throw new Error("Not found");
  if (resume.fileKey) await getStorage().delete(resume.fileKey).catch(() => undefined);
  await prisma.resume.delete({ where: { id: resume.id } });
  if (resume.isDefault) {
    const next = await prisma.resume.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
    if (next) await prisma.resume.update({ where: { id: next.id }, data: { isDefault: true } });
  }
}

/** Replace the content of a version in place (used by the editor). */
export async function saveVersionContent(
  userId: string,
  versionId: string,
  data: StructuredResume,
  opts?: { label?: string },
) {
  const version = await prisma.resumeVersion.findFirst({
    where: { id: versionId, resume: { userId } },
    select: { id: true },
  });
  if (!version) throw new Error("Not found");

  await prisma.$transaction(async (tx) => {
    await tx.experience.deleteMany({ where: { resumeVersionId: versionId } });
    await tx.education.deleteMany({ where: { resumeVersionId: versionId } });
    await tx.certification.deleteMany({ where: { resumeVersionId: versionId } });
    await tx.project.deleteMany({ where: { resumeVersionId: versionId } });
    await tx.language.deleteMany({ where: { resumeVersionId: versionId } });
    await tx.resumeSkill.deleteMany({ where: { resumeVersionId: versionId } });
    await writeVersionContent(tx, versionId, data);
    if (opts?.label) await tx.resumeVersion.update({ where: { id: versionId }, data: { label: opts.label } });
  });
  await attachSkills(versionId, data.skills);
  await prisma.resume.updateMany({
    where: { versions: { some: { id: versionId } }, userId },
    data: { updatedAt: new Date() },
  });
}

/** Create a new version (e.g. a tailored copy) from a StructuredResume. */
export async function createVersion(
  userId: string,
  resumeId: string,
  data: StructuredResume,
  opts: { label: string; source: "EDIT" | "TAILORED"; tailoredForJobId?: string; makeCurrent?: boolean },
) {
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId }, select: { id: true } });
  if (!resume) throw new Error("Not found");

  const version = await prisma.$transaction(async (tx) => {
    if (opts.makeCurrent) {
      await tx.resumeVersion.updateMany({ where: { resumeId }, data: { isCurrent: false } });
    }
    const v = await tx.resumeVersion.create({
      data: {
        resumeId,
        label: opts.label,
        source: opts.source,
        tailoredForJobId: opts.tailoredForJobId,
        isCurrent: opts.makeCurrent ?? false,
      },
    });
    await writeVersionContent(tx, v.id, data);
    return v;
  });
  await attachSkills(version.id, data.skills);
  return version;
}

export async function setCurrentVersion(userId: string, resumeId: string, versionId: string) {
  const owned = await prisma.resumeVersion.findFirst({
    where: { id: versionId, resumeId, resume: { userId } },
    select: { id: true },
  });
  if (!owned) throw new Error("Not found");
  await prisma.$transaction([
    prisma.resumeVersion.updateMany({ where: { resumeId }, data: { isCurrent: false } }),
    prisma.resumeVersion.update({ where: { id: versionId }, data: { isCurrent: true } }),
  ]);
}

/** Flatten a persisted version back into the StructuredResume shape. */
export function versionToStructured(v: ResumeVersionWithChildren): StructuredResume {
  return {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    links: [],
    summary: v.summary ?? "",
    experience: v.experiences.map((e) => ({
      company: e.company,
      title: e.title,
      location: e.location ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      current: e.current,
      bullets: e.bullets,
      techs: e.techs,
    })),
    education: v.educations.map((e) => ({
      institution: e.institution,
      degree: e.degree ?? "",
      field: e.field ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      grade: e.grade ?? "",
    })),
    skills: v.resumeSkills.map((rs) => rs.skill.name),
    certifications: v.certifications.map((c) => ({ name: c.name, issuer: c.issuer ?? "" })),
    projects: v.projects.map((p) => ({
      name: p.name,
      description: p.description ?? "",
      techs: p.techs,
      url: p.url ?? "",
    })),
    languages: v.languages.map((l) => ({ name: l.name, proficiency: l.proficiency ?? "" })),
  };
}
