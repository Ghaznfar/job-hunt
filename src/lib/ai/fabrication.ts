import { extractSkills } from "@/lib/skills/normalize";

/**
 * Detect skills that AI-improved text introduces which are neither in the
 * original text nor in the candidate's allowed skill set. Used to flag (and by
 * default exclude) tailoring changes that would fabricate a qualification.
 */
export function detectIntroducedSkills(
  original: string,
  improved: string,
  allowedSlugs: Set<string>,
): string[] {
  const originalSlugs = new Set(extractSkills(original).map((s) => s.slug));
  return extractSkills(improved)
    .filter((s) => !originalSlugs.has(s.slug) && !allowedSlugs.has(s.slug))
    .map((s) => s.name);
}

/** Convenience wrapper returning a flag + human reason. */
export function screenTailorChange(
  original: string,
  improved: string,
  allowedSlugs: Set<string>,
): { flagged: boolean; flagReason?: string } {
  const introduced = detectIntroducedSkills(original, improved, allowedSlugs);
  if (introduced.length) {
    return {
      flagged: true,
      flagReason: `Adds ${introduced.join(", ")}, which isn't in your CV or profile.`,
    };
  }
  return { flagged: false };
}
