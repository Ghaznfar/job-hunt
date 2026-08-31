import type { RuleMatchResult, DecisionResult, Verdict } from "./types";

const DIMENSION_LABELS = {
  technical: "Technical fit",
  experience: "Experience fit",
  location: "Location fit",
  salary: "Salary fit",
  seniority: "Seniority fit",
  eligibility: "Eligibility",
} as const;

/**
 * Deterministic Should-I-Apply verdict.
 *
 * Hard blockers force DONT_APPLY regardless of the overall score.
 * Otherwise the overall score plus the number of serious concerns decides.
 * The AI layer may rephrase `reasons`/`concerns` but must never change `verdict`.
 */
export function decideVerdict(result: RuleMatchResult): DecisionResult {
  const { scores, overall, flags, strongMatches, missingSkills, notes } = result;
  const reasons: string[] = [];
  const concerns: string[] = [];

  // ---- Positives ----------------------------------------------------------
  if (scores.technical >= 75) {
    reasons.push(
      strongMatches.length
        ? `Strong technical match — you have ${strongMatches.slice(0, 5).join(", ")}.`
        : "Strong technical match for this role.",
    );
  }
  if (scores.experience >= 80) reasons.push(notes.experience ?? "Your experience is in range.");
  if (scores.eligibility >= 90) reasons.push("You're authorized to work here without sponsorship.");
  if (scores.location >= 85)
    reasons.push(notes.location ?? "Location and work arrangement suit you.");
  if (scores.salary >= 90) reasons.push("The salary meets your expectation.");
  if (scores.seniority === 100) reasons.push("The role is pitched at your level.");

  // ---- Concerns ---------------------------------------------------------
  if (missingSkills.length) {
    const requiredMissing = result.skillScores
      .filter((s) => !s.have && s.importance === "REQUIRED")
      .map((s) => s.name);
    if (requiredMissing.length) {
      concerns.push(`Missing required skills: ${requiredMissing.slice(0, 5).join(", ")}.`);
    } else {
      concerns.push(`Missing preferred skills: ${missingSkills.slice(0, 4).join(", ")}.`);
    }
  }
  (Object.keys(DIMENSION_LABELS) as (keyof typeof DIMENSION_LABELS)[]).forEach((k) => {
    if (k === "technical" && missingSkills.length) return; // already covered
    if (scores[k] < 55)
      concerns.push(notes[k] ?? `${DIMENSION_LABELS[k]} is weak (${scores[k]}%).`);
  });

  // ---- Hard blockers --------------------------------------------------
  let verdict: Verdict;
  if (flags.sponsorshipBlocked || flags.notWorkAuthorized) {
    verdict = "DONT_APPLY";
    if (!concerns.some((c) => /authoriz|sponsor/i.test(c))) {
      concerns.unshift(
        notes.eligibility ?? "You are not eligible to work in this role's location.",
      );
    }
  } else if (flags.severelyUnderExperienced) {
    verdict = "DONT_APPLY";
  } else if (flags.onsiteMismatch) {
    verdict = "DONT_APPLY";
  } else {
    // ---- Score-based verdict ------------------------------------------
    const missingRequired = result.skillScores.filter(
      (s) => !s.have && s.importance === "REQUIRED",
    ).length;
    const seriousConcerns = concerns.length;
    const canApply =
      overall >= 75 &&
      scores.eligibility >= 60 &&
      scores.technical >= 65 &&
      missingRequired === 0 &&
      seriousConcerns <= 1;

    if (canApply) {
      verdict = "APPLY";
    } else if (overall >= 55 && scores.eligibility >= 40) {
      verdict = "MAYBE";
    } else {
      verdict = "DONT_APPLY";
    }
    // Eligibility uncertainty can't be a clean APPLY.
    if (verdict === "APPLY" && result.flags.eligibilityUncertain) {
      verdict = "MAYBE";
      concerns.push("Confirm work authorization / sponsorship with the employer before applying.");
    }
  }

  if (reasons.length === 0) {
    reasons.push("Some elements of this role align with your profile — see the breakdown.");
  }

  return { verdict, reasons: dedupe(reasons), concerns: dedupe(concerns) };
}

function dedupe(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()))].filter(Boolean);
}
