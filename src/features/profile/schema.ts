import { z } from "zod";
import { WORK_AUTH_STATUSES } from "./constants";

const authStatus = z.enum(WORK_AUTH_STATUSES.map((s) => s.value) as [string, ...string[]]);

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine((v) => v === undefined || /^https?:\/\/.+/.test(v), "Must be a valid URL (https://…)");

export const profileSchema = z.object({
  // Personal
  name: z.string().trim().min(1, "Enter your name").max(120),
  country: z.string().trim().min(1, "Select your country"),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,

  // Career
  currentTitle: z.string().trim().max(120).optional().or(z.literal("")),
  yearsExperience: z.coerce.number().min(0).max(50).optional(),
  desiredTitles: z.array(z.string().trim().min(1)).max(10).default([]),
  targetCountries: z.array(z.string().trim().min(1)).max(5).default([]),
  workPreference: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
  salaryExpectation: z.coerce.number().int().min(0).max(10_000_000).optional(),
  salaryCurrency: z.string().trim().max(3).default("USD"),

  // Eligibility
  needsSponsorship: z.coerce.boolean().default(false),
  workAuthUS: authStatus.optional(),
  workAuthGB: authStatus.optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const skillsSchema = z.object({
  skillSlugs: z.array(z.string().trim().min(1)).max(60).default([]),
  customSkills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});
export type SkillsInput = z.infer<typeof skillsSchema>;
