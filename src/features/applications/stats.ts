import type { ApplicationStatus } from "@prisma/client";
import {
  APPLIED_OR_BEYOND,
  RESPONDED_STATUSES,
  INTERVIEW_STATUSES,
} from "./constants";

export interface ApplicationStatsInput {
  /** Current status of each application. */
  statuses: ApplicationStatus[];
  /** Every status each application has *ever* held (from ApplicationEvent). */
  everHeld: ApplicationStatus[][];
}

export interface ApplicationStats {
  total: number;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
  responseRate: number; // 0..100, share of applied-or-beyond that got a response
}

/** Pure stats computation — unit tested. */
export function computeApplicationStats(input: ApplicationStatsInput): ApplicationStats {
  const total = input.statuses.length;

  const appliedCount = input.everHeld.filter((held) =>
    held.some((s) => APPLIED_OR_BEYOND.includes(s)),
  ).length;

  const respondedCount = input.everHeld.filter((held) =>
    held.some((s) => RESPONDED_STATUSES.includes(s)),
  ).length;

  const interviews = input.statuses.filter((s) => INTERVIEW_STATUSES.includes(s)).length;
  const offers = input.statuses.filter((s) => s === "OFFER").length;
  const rejected = input.statuses.filter((s) => s === "REJECTED").length;

  return {
    total,
    applied: appliedCount,
    interviews,
    offers,
    rejected,
    responseRate: appliedCount === 0 ? 0 : Math.round((respondedCount / appliedCount) * 100),
  };
}
