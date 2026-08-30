import { SKILL_TAXONOMY, type CanonicalSkill } from "./taxonomy";

/** Lowercase, strip punctuation noise, collapse whitespace. */
export function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[()[\]{}"|]/g, " ")
    .replace(/[,/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Build a lookup of every alias + canonical name -> canonical skill.
const LOOKUP = new Map<string, CanonicalSkill>();
for (const skill of SKILL_TAXONOMY) {
  LOOKUP.set(normalizeToken(skill.name), skill);
  LOOKUP.set(skill.slug, skill);
  for (const alias of skill.aliases) LOOKUP.set(normalizeToken(alias), skill);
}

/**
 * Resolve a free-form skill string to a canonical skill, or null if unknown.
 * Tries exact normalised match, then a conservative word-boundary contains check.
 */
export function resolveSkill(raw: string): CanonicalSkill | null {
  const token = normalizeToken(raw);
  if (!token) return null;

  const exact = LOOKUP.get(token);
  if (exact) return exact;

  // token like "experience with kubernetes" -> match a known alias as a whole word
  for (const [key, skill] of LOOKUP) {
    if (key.length < 3) continue;
    const re = new RegExp(`(^|\\s)${escapeRegExp(key)}($|\\s)`);
    if (re.test(token)) return skill;
  }
  return null;
}

/**
 * Extract the set of canonical skills mentioned in a block of text
 * (e.g. a job description or a resume skills section).
 */
export function extractSkills(text: string): CanonicalSkill[] {
  if (!text) return [];
  const haystack = normalizeToken(text);
  const found = new Map<string, CanonicalSkill>();
  for (const skill of SKILL_TAXONOMY) {
    const candidates = [normalizeToken(skill.name), ...skill.aliases.map(normalizeToken)];
    for (const c of candidates) {
      if (c.length < 2) continue;
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(c)}([^a-z0-9]|$)`);
      if (re.test(haystack)) {
        found.set(skill.slug, skill);
        break;
      }
    }
  }
  return [...found.values()];
}

/** Split a comma / newline / semicolon separated list into canonical skills. */
export function parseSkillList(input: string): { resolved: CanonicalSkill[]; unresolved: string[] } {
  const parts = input
    .split(/[\n,;•]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const resolved = new Map<string, CanonicalSkill>();
  const unresolved: string[] = [];
  for (const part of parts) {
    const skill = resolveSkill(part);
    if (skill) resolved.set(skill.slug, skill);
    else unresolved.push(part);
  }
  return { resolved: [...resolved.values()], unresolved };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
