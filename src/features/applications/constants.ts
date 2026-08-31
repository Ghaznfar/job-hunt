import type { ApplicationStatus } from "@prisma/client";

export const STATUS_ORDER: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "TECHNICAL_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  TECHNICAL_INTERVIEW: "Technical Interview",
  FINAL_INTERVIEW: "Final Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

/** Column accent used in the board header. */
export const STATUS_ACCENT: Record<ApplicationStatus, string> = {
  SAVED: "bg-muted-foreground",
  APPLIED: "bg-chart-1",
  SCREENING: "bg-chart-5",
  INTERVIEW: "bg-chart-3",
  TECHNICAL_INTERVIEW: "bg-chart-3",
  FINAL_INTERVIEW: "bg-chart-3",
  OFFER: "bg-success",
  REJECTED: "bg-destructive",
  WITHDRAWN: "bg-muted-foreground",
};

/** Statuses that count as "applied" and as "got a response" for the response-rate stat. */
export const APPLIED_OR_BEYOND: ApplicationStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "TECHNICAL_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "REJECTED",
];
export const RESPONDED_STATUSES: ApplicationStatus[] = [
  "SCREENING",
  "INTERVIEW",
  "TECHNICAL_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "REJECTED",
];
export const INTERVIEW_STATUSES: ApplicationStatus[] = [
  "INTERVIEW",
  "TECHNICAL_INTERVIEW",
  "FINAL_INTERVIEW",
];
