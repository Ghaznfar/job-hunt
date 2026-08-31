import "server-only";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";
import type { UsageFeature } from "@prisma/client";

export class UsageLimitError extends Error {
  constructor(
    public feature: UsageFeature,
    public limit: number,
  ) {
    super("Monthly limit reached for this feature.");
    this.name = "UsageLimitError";
  }
}

export class FeatureLockedError extends Error {
  constructor(public feature: UsageFeature) {
    super("This feature requires a Pro subscription.");
    this.name = "FeatureLockedError";
  }
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function getPlan(userId: string): Promise<PlanId> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });
  if (sub?.plan === "PRO" && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(sub.status)) return "PRO";
  return "FREE";
}

/** Map a metered feature to its plan limit + whether the plan unlocks it at all. */
function resolveLimit(plan: PlanId, feature: UsageFeature): { limit: number; locked: boolean } {
  const L = PLAN_LIMITS[plan];
  switch (feature) {
    case "JOB_MATCH":
      return { limit: L.jobMatchesPerMonth, locked: false };
    case "CV_ANALYSIS":
      return { limit: L.cvAnalysesPerMonth, locked: false };
    case "CV_TAILOR":
      return { limit: L.aiGenerationsPerMonth, locked: !L.cvTailoring };
    case "COVER_LETTER":
      return { limit: L.aiGenerationsPerMonth, locked: !L.coverLetters };
    case "INTERVIEW_PREP":
      return { limit: L.aiGenerationsPerMonth, locked: !L.interviewPrep };
    case "SKILL_GAP":
      return { limit: L.aiGenerationsPerMonth, locked: !L.skillGapAnalysis };
    case "CAREER_ADVICE":
      return { limit: L.aiGenerationsPerMonth, locked: !L.skillGapAnalysis };
    default:
      return { limit: 0, locked: true };
  }
}

export interface UsageStatus {
  feature: UsageFeature;
  plan: PlanId;
  used: number;
  limit: number;
  remaining: number;
  locked: boolean;
}

export async function getUsageStatus(userId: string, feature: UsageFeature): Promise<UsageStatus> {
  const plan = await getPlan(userId);
  const { limit, locked } = resolveLimit(plan, feature);
  const row = await prisma.usageCounter.findUnique({
    where: { userId_period_feature: { userId, period: currentPeriod(), feature } },
    select: { count: true },
  });
  const used = row?.count ?? 0;
  return { feature, plan, used, limit, remaining: Math.max(0, limit - used), locked };
}

/**
 * Assert the user may use `feature` and atomically consume one unit.
 * Throws FeatureLockedError / UsageLimitError when not allowed.
 */
export async function consumeUsage(userId: string, feature: UsageFeature): Promise<UsageStatus> {
  const plan = await getPlan(userId);
  const { limit, locked } = resolveLimit(plan, feature);
  if (locked) throw new FeatureLockedError(feature);

  const period = currentPeriod();
  const updated = await prisma.usageCounter.upsert({
    where: { userId_period_feature: { userId, period, feature } },
    create: { userId, period, feature, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (updated.count > limit) {
    // Roll back the increment we just made.
    await prisma.usageCounter.update({
      where: { userId_period_feature: { userId, period, feature } },
      data: { count: { decrement: 1 } },
    });
    throw new UsageLimitError(feature, limit);
  }
  return {
    feature,
    plan,
    used: updated.count,
    limit,
    remaining: Math.max(0, limit - updated.count),
    locked: false,
  };
}

export async function getAllUsage(userId: string): Promise<UsageStatus[]> {
  const features: UsageFeature[] = [
    "JOB_MATCH",
    "CV_ANALYSIS",
    "CV_TAILOR",
    "COVER_LETTER",
    "INTERVIEW_PREP",
    "SKILL_GAP",
  ];
  return Promise.all(features.map((f) => getUsageStatus(userId, f)));
}
