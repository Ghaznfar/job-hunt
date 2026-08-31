import { env } from "@/lib/env";

export type PlanId = "FREE" | "PRO";

export interface PlanFeatureLimits {
  jobMatchesPerMonth: number;
  cvAnalysesPerMonth: number;
  aiGenerationsPerMonth: number; // cover letters + tailoring + interview prep + skill gap
  cvTailoring: boolean;
  coverLetters: boolean;
  interviewPrep: boolean;
  skillGapAnalysis: boolean;
  jobAlerts: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanFeatureLimits> = {
  FREE: {
    jobMatchesPerMonth: env.FREE_MONTHLY_JOB_MATCH,
    cvAnalysesPerMonth: env.FREE_MONTHLY_CV_ANALYSIS,
    aiGenerationsPerMonth: env.FREE_MONTHLY_AI_GENERATIONS,
    cvTailoring: false,
    coverLetters: false,
    interviewPrep: false,
    skillGapAnalysis: false,
    jobAlerts: false,
  },
  PRO: {
    jobMatchesPerMonth: 500,
    cvAnalysesPerMonth: 100,
    aiGenerationsPerMonth: 300,
    cvTailoring: true,
    coverLetters: true,
    interviewPrep: true,
    skillGapAnalysis: true,
    jobAlerts: true,
  },
};

export const PRO_PRICE_MONTHLY_USD = 9.99;

export const PRICING_COPY = {
  FREE: {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Everything you need to evaluate jobs and stay organised.",
    features: [
      `${PLAN_LIMITS.FREE.jobMatchesPerMonth} job match analyses / month`,
      `${PLAN_LIMITS.FREE.cvAnalysesPerMonth} CV analyses / month`,
      `${PLAN_LIMITS.FREE.aiGenerationsPerMonth} AI generations / month`,
      "Job search & Should I Apply verdict",
      "Application tracker",
    ],
  },
  PRO: {
    name: "Pro",
    price: `$${PRO_PRICE_MONTHLY_USD}`,
    cadence: "per month",
    blurb: "For an active search — full AI toolkit and generous limits.",
    features: [
      "500 job match analyses / month",
      "CV tailoring (diff + approve)",
      "Personalised cover letters",
      "Interview preparation with AI feedback",
      "Skill-gap analysis & job alerts",
      "Priority AI processing",
    ],
  },
} as const;
