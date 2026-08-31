import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const DAY = 86_400_000;

export async function getAdminMetrics() {
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY);
  const since30 = new Date(now - 30 * DAY);

  const [
    totalUsers,
    newUsers7,
    activeUsers30,
    proUsers,
    totalJobs,
    jobsWithSkills,
    totalApplications,
    totalMatches,
    aiAgg,
    aiErrors7,
    errors7,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.user.count({
      where: {
        OR: [
          { aiRequests: { some: { createdAt: { gte: since30 } } } },
          { applications: { some: { updatedAt: { gte: since30 } } } },
          { jobMatches: { some: { createdAt: { gte: since30 } } } },
        ],
      },
    }),
    prisma.subscription.count({
      where: { plan: "PRO", status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    }),
    prisma.job.count(),
    prisma.job.count({ where: { jobSkills: { some: {} } } }),
    prisma.application.count(),
    prisma.jobMatch.count(),
    prisma.aIRequest.aggregate({
      _count: true,
      _sum: { costCents: true, promptTokens: true, completionTokens: true },
      where: { createdAt: { gte: since30 } },
    }),
    prisma.aIRequest.count({ where: { status: "ERROR", createdAt: { gte: since7 } } }),
    prisma.errorLog.count({
      where: { createdAt: { gte: since7 }, level: { in: ["ERROR", "WARN"] } },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      new7d: newUsers7,
      active30d: activeUsers30,
      free: totalUsers - proUsers,
      pro: proUsers,
    },
    jobs: { total: totalJobs, withSkills: jobsWithSkills },
    applications: totalApplications,
    matches: totalMatches,
    ai: {
      requests30d: aiAgg._count,
      costUsd30d: ((aiAgg._sum.costCents ?? 0) / 100).toFixed(2),
      tokens30d: (aiAgg._sum.promptTokens ?? 0) + (aiAgg._sum.completionTokens ?? 0),
      errors7d: aiErrors7,
    },
    errors7d: errors7,
  };
}

export async function listUsers(q?: string, take = 50) {
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  return prisma.user.findMany({
    where,
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabledAt: true,
      emailVerified: true,
      createdAt: true,
      subscription: { select: { plan: true, status: true } },
      _count: { select: { applications: true, resumes: true, jobMatches: true } },
    },
  });
}

export async function listRecentJobs(take = 50) {
  return prisma.job.findMany({
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      company: true,
      country: true,
      workArrangement: true,
      createdAt: true,
      source: { select: { key: true } },
      _count: { select: { jobSkills: true, jobMatches: true } },
    },
  });
}

export async function listJobSources() {
  return prisma.jobSource.findMany({
    orderBy: { key: "asc" },
    include: { _count: { select: { jobs: true } } },
  });
}

export async function listApplicationsAdmin(take = 50) {
  return prisma.application.findMany({
    take,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      company: true,
      title: true,
      status: true,
      updatedAt: true,
      user: { select: { email: true } },
    },
  });
}

export async function listSubscriptions(take = 100) {
  return prisma.subscription.findMany({
    take,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      plan: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      stripeCustomerId: true,
      user: { select: { email: true } },
    },
  });
}

export async function getAIUsage(take = 100) {
  const [recent, byFeature] = await Promise.all([
    prisma.aIRequest.findMany({
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        feature: true,
        provider: true,
        model: true,
        status: true,
        costCents: true,
        latencyMs: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
    prisma.aIRequest.groupBy({
      by: ["feature", "status"],
      _count: true,
      _sum: { costCents: true },
    }),
  ]);
  return { recent, byFeature };
}

export async function listErrors(take = 100) {
  return prisma.errorLog.findMany({ take, orderBy: { createdAt: "desc" } });
}

export async function setUserRole(actorId: string, userId: string, role: "USER" | "ADMIN") {
  if (actorId === userId && role === "USER") {
    throw new Error("You can't remove your own admin role.");
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await prisma.auditLog.create({
    data: { actorId, action: "user.setRole", target: userId, meta: { role } },
  });
}

export async function setUserDisabled(actorId: string, userId: string, disabled: boolean) {
  if (actorId === userId) throw new Error("You can't disable your own account.");
  await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: disabled ? new Date() : null },
  });
  await prisma.auditLog.create({
    data: { actorId, action: disabled ? "user.disable" : "user.enable", target: userId, meta: {} },
  });
}

export async function listAuditLog(take = 100) {
  return prisma.auditLog.findMany({
    take,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { email: true } } },
  });
}
