import type { CandidateInput, JobInput, RuleMatchResult } from "./types";
import {
  scoreTechnical,
  scoreExperience,
  scoreLocation,
  scoreSalary,
  scoreSeniority,
  scoreEligibility,
} from "./dimensions";

export const DIMENSION_WEIGHTS = {
  technical: 0.35,
  experience: 0.2,
  eligibility: 0.2,
  seniority: 0.1,
  location: 0.1,
  salary: 0.05,
} as const;

/** Pure, deterministic match computation. No AI, no I/O. */
export function computeMatch(candidate: CandidateInput, job: JobInput): RuleMatchResult {
  const technical = scoreTechnical(candidate, job);
  const experience = scoreExperience(candidate, job);
  const location = scoreLocation(candidate, job);
  const salary = scoreSalary(candidate, job);
  const seniority = scoreSeniority(candidate, job);
  const eligibility = scoreEligibility(candidate, job);

  const scores = {
    technical: technical.score,
    experience: experience.score,
    location: location.score,
    salary: salary.score,
    seniority: seniority.score,
    eligibility: eligibility.score,
  };

  const overall = Math.round(
    (Object.keys(DIMENSION_WEIGHTS) as (keyof typeof DIMENSION_WEIGHTS)[]).reduce(
      (sum, k) => sum + DIMENSION_WEIGHTS[k] * scores[k],
      0,
    ),
  );

  return {
    scores,
    overall,
    skillScores: technical.skillScores,
    strongMatches: technical.strongMatches,
    missingSkills: technical.missingSkills,
    notes: {
      technical: technical.note,
      experience: experience.note,
      location: location.note,
      salary: salary.note,
      seniority: seniority.note,
      eligibility: eligibility.note,
    },
    flags: {
      sponsorshipBlocked: eligibility.flags.sponsorshipBlocked,
      notWorkAuthorized: eligibility.flags.notWorkAuthorized,
      onsiteMismatch: location.score < 25,
      severelyUnderExperienced:
        experience.score < 35 &&
        job.minYearsRequired != null &&
        (candidate.yearsExperience ?? 0) <= job.minYearsRequired - 3,
      eligibilityUncertain: eligibility.flags.eligibilityUncertain,
    },
  };
}
