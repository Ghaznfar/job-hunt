import type {
  StructuredResume,
  JobAnalysis,
  ResumeAnalysis,
  MatchExplanation,
  TailorResult,
  InterviewQuestions,
  AnswerFeedback,
  SkillGap,
} from "./types";

export interface AIUsage {
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

export type AIResponse<T> = { data: T; usage: AIUsage };

// ---- Method input shapes ---------------------------------------------------

export interface JobContext {
  title: string;
  company: string;
  location?: string;
  country?: string;
  description: string;
  requirementsText?: string;
}

export interface ProfileContext {
  currentTitle?: string | null;
  yearsExperience?: number | null;
  desiredTitles: string[];
  skills: string[]; // canonical names the user actually has
  country?: string | null;
}

export interface MatchContext {
  job: JobContext;
  profile: ProfileContext;
  scores: {
    overall: number;
    technical: number;
    experience: number;
    location: number;
    salary: number;
    seniority: number;
    eligibility: number;
  };
  strongMatches: string[];
  missingSkills: string[];
  verdict: "APPLY" | "MAYBE" | "DONT_APPLY";
  deterministicReasons: string[];
  deterministicConcerns: string[];
}

export interface TailorContext {
  resume: StructuredResume;
  job: JobContext;
  /** Canonical skills the user actually has — the AI must not claim any others. */
  allowedSkills: string[];
}

export interface CoverLetterContext {
  job: JobContext;
  profile: ProfileContext;
  resumeSummary: string;
  highlights: string[];
  tone: "professional" | "enthusiastic" | "concise" | "warm";
}

export interface AIProvider {
  readonly name: string;
  analyzeJob(job: JobContext): Promise<AIResponse<JobAnalysis>>;
  structureResume(rawText: string): Promise<AIResponse<StructuredResume>>;
  analyzeResume(resume: StructuredResume): Promise<AIResponse<ResumeAnalysis>>;
  explainMatch(ctx: MatchContext): Promise<AIResponse<MatchExplanation>>;
  tailorResume(ctx: TailorContext): Promise<AIResponse<TailorResult>>;
  generateCoverLetter(ctx: CoverLetterContext): Promise<AIResponse<{ content: string }>>;
  generateInterviewQuestions(
    job: JobContext,
    profile: ProfileContext,
  ): Promise<AIResponse<InterviewQuestions>>;
  evaluateAnswer(
    question: string,
    answer: string,
    job: JobContext,
  ): Promise<AIResponse<AnswerFeedback>>;
  skillGapAnalysis(
    targetTitles: string[],
    jobSkillFrequencies: { skill: string; count: number }[],
    userSkills: string[],
  ): Promise<AIResponse<SkillGap>>;
}
