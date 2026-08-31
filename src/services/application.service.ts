import "server-only";
import { prisma } from "@/lib/db";
import { computeApplicationStats } from "@/features/applications/stats";
import type { ApplicationStatus, Prisma } from "@prisma/client";

interface CreateInput {
  jobId?: string;
  company: string;
  title: string;
  jobUrl?: string;
  salary?: string;
  status?: ApplicationStatus;
  contactName?: string;
  contactEmail?: string;
  nextInterviewAt?: string;
  notes?: string;
}

export async function createApplication(userId: string, input: CreateInput) {
  const status = input.status ?? "SAVED";

  // Prevent duplicate tracking of the same job.
  if (input.jobId) {
    const existing = await prisma.application.findFirst({
      where: { userId, jobId: input.jobId },
      select: { id: true },
    });
    if (existing) return prisma.application.findUnique({ where: { id: existing.id } });
  }

  const maxOrder = await prisma.application.aggregate({
    where: { userId, status },
    _max: { boardOrder: true },
  });

  return prisma.application.create({
    data: {
      userId,
      jobId: input.jobId,
      company: input.company,
      title: input.title,
      jobUrl: input.jobUrl,
      salary: input.salary,
      status,
      boardOrder: (maxOrder._max.boardOrder ?? -1) + 1,
      appliedAt: status === "APPLIED" ? new Date() : null,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      nextInterviewAt: input.nextInterviewAt ? new Date(input.nextInterviewAt) : null,
      events: { create: { toStatus: status } },
      notes: input.notes ? { create: { body: input.notes } } : undefined,
    },
  });
}

export async function updateApplicationFields(
  userId: string,
  id: string,
  fields: Partial<CreateInput>,
) {
  const owned = await prisma.application.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Not found");
  const data: Prisma.ApplicationUpdateInput = {};
  if (fields.company !== undefined) data.company = fields.company;
  if (fields.title !== undefined) data.title = fields.title;
  if (fields.jobUrl !== undefined) data.jobUrl = fields.jobUrl || null;
  if (fields.salary !== undefined) data.salary = fields.salary || null;
  if (fields.contactName !== undefined) data.contactName = fields.contactName || null;
  if (fields.contactEmail !== undefined) data.contactEmail = fields.contactEmail || null;
  if (fields.nextInterviewAt !== undefined) {
    data.nextInterviewAt = fields.nextInterviewAt ? new Date(fields.nextInterviewAt) : null;
  }
  return prisma.application.update({ where: { id }, data });
}

export async function moveApplication(userId: string, id: string, status: ApplicationStatus) {
  const app = await prisma.application.findFirst({
    where: { id, userId },
    select: { id: true, status: true, appliedAt: true },
  });
  if (!app) throw new Error("Not found");
  if (app.status === status) return app;

  const maxOrder = await prisma.application.aggregate({
    where: { userId, status },
    _max: { boardOrder: true },
  });

  await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: {
        status,
        boardOrder: (maxOrder._max.boardOrder ?? -1) + 1,
        appliedAt: status === "APPLIED" && !app.appliedAt ? new Date() : undefined,
      },
    }),
    prisma.applicationEvent.create({
      data: { applicationId: id, fromStatus: app.status, toStatus: status },
    }),
  ]);
  return prisma.application.findUnique({ where: { id } });
}

export async function reorderApplications(
  userId: string,
  status: ApplicationStatus,
  orderedIds: string[],
) {
  const owned = await prisma.application.findMany({
    where: { userId, id: { in: orderedIds } },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((o) => o.id));
  await prisma.$transaction(
    orderedIds
      .filter((id) => ownedSet.has(id))
      .map((id, index) =>
        prisma.application.update({ where: { id }, data: { boardOrder: index, status } }),
      ),
  );
}

export async function addApplicationNote(userId: string, applicationId: string, body: string) {
  const owned = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });
  if (!owned) throw new Error("Not found");
  return prisma.applicationNote.create({ data: { applicationId, body } });
}

export async function deleteApplication(userId: string, id: string) {
  const res = await prisma.application.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new Error("Not found");
}

export async function getBoard(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { boardOrder: "asc" }],
    include: {
      job: { select: { id: true } },
      notes: { orderBy: { createdAt: "desc" } },
      _count: { select: { notes: true } },
    },
  });
}

export async function getApplication(userId: string, id: string) {
  return prisma.application.findFirst({
    where: { id, userId },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "asc" } },
      job: { select: { id: true, title: true, company: true } },
    },
  });
}

export async function getApplicationStats(userId: string) {
  const [apps, events] = await Promise.all([
    prisma.application.findMany({ where: { userId }, select: { id: true, status: true } }),
    prisma.applicationEvent.findMany({
      where: { application: { userId } },
      select: { applicationId: true, toStatus: true },
    }),
  ]);
  const eventsByApp = new Map<string, ApplicationStatus[]>();
  for (const app of apps) eventsByApp.set(app.id, [app.status]);
  for (const e of events) {
    const arr = eventsByApp.get(e.applicationId);
    if (arr && !arr.includes(e.toStatus)) arr.push(e.toStatus);
  }
  return computeApplicationStats({
    statuses: apps.map((a) => a.status),
    everHeld: apps.map((a) => eventsByApp.get(a.id) ?? [a.status]),
  });
}
