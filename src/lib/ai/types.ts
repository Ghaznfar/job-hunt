import { z } from "zod";

// ---------------------------------------------------------------------------
// Structured résumé (output of structureResume)
// ---------------------------------------------------------------------------

export const structuredExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  current: z.boolean().optional().default(false),
  bullets: z.array(z.string()).default([]),
  techs: z.array(z.string()).default([]),
});

export const structuredEducationSchema = z.object({
  institution: z.string(),
  degree: z.string().optional().default(""),
  field: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  grade: z.string().optional().default(""),
});

export const structuredResumeSchema = z.object({
  fullName: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  location: z.string().optional().default(""),
  links: z.array(z.string()).default([]),
  summary: z.string().optional().default(""),
  experience: z.array(structuredExperienceSchema).default([]),
  education: z.array(structuredEducationSchema).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z
    .array(z.object({ name: z.string(), issuer: z.string().optional().default("") }))
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional().default(""),
        techs: z.array(z.string()).default([]),
        url: z.string().optional().default(""),
      }),
    )
    .default([]),
  languages: z
    .array(z.object({ name: z.string(), proficiency: z.string().optional().default("") }))
    .default([]),
});
export type StructuredResume = z.infer<typeof structuredResumeSchema>;

// ---------------------------------------------------------------------------
// Job requirement extraction (output of analyzeJob)
// ---------------------------------------------------------------------------

export const jobAnalysisSchema = z.object({
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  minYears: z.number().nullable().default(null),
  maxYears: z.number().nullable().default(null),
  seniorityLevel: z
    .enum(["intern", "junior", "mid", "senior", "staff", "principal", "lead", "unknown"])
    .default("unknown"),
  workArrangement: z.enum(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]).default("UNKNOWN"),
  requiresWorkAuthorization: z.array(z.string()).default([]), // ISO country codes
  sponsorshipAvailable: z.enum(["YES", "NO", "UNKNOWN"]).default("UNKNOWN"),
  responsibilitiesSummary: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0.5),
});
export type JobAnalysis = z.infer<typeof jobAnalysisSchema>;

// ---------------------------------------------------------------------------
// Résumé analysis (output of analyzeResume)
// ---------------------------------------------------------------------------

export const resumeAnalysisSchema = z.object({
  summary: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  detectedSkills: z.array(z.string()).default([]),
  totalYearsExperience: z.number().nullable().default(null),
});
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;

// ---------------------------------------------------------------------------
// Match explanation (output of explainMatch)
// ---------------------------------------------------------------------------

export const matchExplanationSchema = z.object({
  recommendation: z.string().default(""),
  reasons: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
});
export type MatchExplanation = z.infer<typeof matchExplanationSchema>;

// ---------------------------------------------------------------------------
// CV tailoring (output of tailorResume)
// ---------------------------------------------------------------------------

export const tailorChangeSchema = z.object({
  section: z.string(),
  location: z.string().default(""), // e.g. "Experience · Acme Corp · bullet 2"
  original: z.string(),
  improved: z.string(),
  reason: z.string(),
});
export const tailorResultSchema = z.object({
  changes: z.array(tailorChangeSchema).default([]),
  skillsToHighlight: z.array(z.string()).default([]),
  overallNote: z.string().default(""),
});
export type TailorResult = z.infer<typeof tailorResultSchema>;

// ---------------------------------------------------------------------------
// Cover letter
// ---------------------------------------------------------------------------

export const coverLetterSchema = z.object({ content: z.string() });

// ---------------------------------------------------------------------------
// Interview questions
// ---------------------------------------------------------------------------

export const interviewQuestionsSchema = z.object({
  technical: z.array(z.string()).default([]),
  scenario: z.array(z.string()).default([]),
  behavioral: z.array(z.string()).default([]),
  hr: z.array(z.string()).default([]),
  jobSpecific: z.array(z.string()).default([]),
});
export type InterviewQuestions = z.infer<typeof interviewQuestionsSchema>;

export const answerFeedbackSchema = z.object({
  feedback: z.string().default(""),
  improvedAnswer: z.string().default(""),
  score: z.number().min(0).max(100).nullable().default(null),
});
export type AnswerFeedback = z.infer<typeof answerFeedbackSchema>;

// ---------------------------------------------------------------------------
// Skill gap
// ---------------------------------------------------------------------------

export const skillGapSchema = z.object({
  topSkills: z
    .array(z.object({ skill: z.string(), demand: z.number().min(0).max(100), haveIt: z.boolean() }))
    .default([]),
  summary: z.string().default(""),
});
export type SkillGap = z.infer<typeof skillGapSchema>;

export const careerAdviceSchema = z.object({
  suggestions: z.array(z.string()).default([]),
});
