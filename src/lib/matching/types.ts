export type WorkAuthStatus =
  | "CITIZEN"
  | "PERMANENT_RESIDENT"
  | "VISA_HOLDER"
  | "NEEDS_SPONSORSHIP"
  | "NONE"
  | "UNKNOWN";

export interface CandidateInput {
  yearsExperience: number | null;
  currentTitle: string | null;
  /** Canonical skill slugs the candidate actually has (profile + current CV). */
  skillSlugs: Set<string>;
  country: string | null;
  targetCountries: string[];
  workPreference: "REMOTE" | "HYBRID" | "ONSITE" | null;
  salaryExpectation: number | null;
  salaryCurrency: string | null;
  needsSponsorship: boolean;
  workAuthorizations: Record<string, WorkAuthStatus>;
}

export interface JobInput {
  country: string;
  workArrangement: "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
  seniorityLevel: string | null;
  minYearsRequired: number | null;
  maxYearsRequired: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  requiresWorkAuthorization: string[];
  sponsorshipAvailable: "YES" | "NO" | "UNKNOWN";
  requiredSkillSlugs: { slug: string; name: string }[];
  preferredSkillSlugs: { slug: string; name: string }[];
}

export interface SkillScore {
  slug: string;
  name: string;
  importance: "REQUIRED" | "PREFERRED";
  have: boolean;
  score: number;
}

export interface DimensionScores {
  technical: number;
  experience: number;
  location: number;
  salary: number;
  seniority: number;
  eligibility: number;
}

export interface RuleMatchResult {
  scores: DimensionScores;
  overall: number;
  skillScores: SkillScore[];
  strongMatches: string[];
  missingSkills: string[];
  /** Human-readable notes produced by the deterministic engine per dimension. */
  notes: Partial<Record<keyof DimensionScores, string>>;
  /** Hard signals the decision engine consumes. */
  flags: {
    sponsorshipBlocked: boolean;
    notWorkAuthorized: boolean;
    onsiteMismatch: boolean;
    severelyUnderExperienced: boolean;
    eligibilityUncertain: boolean;
  };
}

export type Verdict = "APPLY" | "MAYBE" | "DONT_APPLY";

export interface DecisionResult {
  verdict: Verdict;
  reasons: string[];
  concerns: string[];
}
