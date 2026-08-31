import { createHash } from "node:crypto";
import { extractSkills, normalizeToken } from "@/lib/skills/normalize";
import type { RawJob, NormalizedJob } from "./types";

const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "US",
  usa: "US",
  us: "US",
  "u.s.": "US",
  america: "US",
  "united kingdom": "GB",
  uk: "GB",
  "u.k.": "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
};

export function normalizeCountry(input?: string, location?: string): string {
  const candidates = [input, location].filter(Boolean).map((s) => s!.toLowerCase());
  for (const c of candidates) {
    if (/^[a-z]{2}$/.test(c)) return c.toUpperCase();
    for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
      if (c.includes(alias)) return code;
    }
  }
  return "US";
}

export function normalizeArrangement(
  ...hints: (string | undefined)[]
): NormalizedJob["workArrangement"] {
  const t = hints.filter(Boolean).join(" ").toLowerCase();
  if (!t) return "UNKNOWN";
  if (/\bhybrid\b/.test(t)) return "HYBRID";
  if (/fully remote|100% remote|remote[- ]first|work from home|wfh|remote \(|telecommute/.test(t))
    return "REMOTE";
  if (/on[- ]?site|in[- ]office|in person|onsite/.test(t)) return "ONSITE";
  if (/\bremote\b/.test(t)) return "REMOTE";
  return "UNKNOWN";
}

const YEARS_RE = /(\d{1,2})\s*\+?\s*(?:-\s*(\d{1,2})\s*)?(?:years?|yrs?)\b(?:[^.]{0,30}experience)?/i;

export function detectYears(text: string): { min: number | null; max: number | null } {
  const m = text.match(YEARS_RE);
  if (!m) return { min: null, max: null };
  const min = Number(m[1]);
  const max = m[2] ? Number(m[2]) : null;
  if (!Number.isFinite(min) || min > 30) return { min: null, max: null };
  return { min, max: max && max <= 40 ? max : null };
}

export function detectSeniority(title: string, text: string): string | null {
  const t = `${title} ${text.slice(0, 500)}`.toLowerCase();
  if (/\bprincipal\b/.test(t)) return "principal";
  if (/\bstaff\b/.test(t)) return "staff";
  if (/\blead\b|\bhead of\b/.test(t)) return "lead";
  if (/\bsenior\b|\bsr\.?\b/.test(t)) return "senior";
  if (/\bjunior\b|\bjr\.?\b|\bgraduate\b|\bentry[- ]level\b|\bintern\b/.test(t)) return "junior";
  return "mid";
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Pull a "Requirements"/"What you'll need" style block out of the description. */
function extractRequirements(text: string): string | null {
  const m = text.match(
    /(requirements|what you.?ll need|what we.?re looking for|qualifications|must have|about you)[:\s]*\n([\s\S]{0,1500})/i,
  );
  return m ? m[2].trim() : null;
}

/**
 * Deterministic fingerprint for duplicate detection across providers.
 * Same company + same normalized title + same country => same fingerprint.
 */
export function fingerprintJob(company: string, title: string, country: string): string {
  const norm = (s: string) =>
    normalizeToken(s)
      .replace(/\b(inc|ltd|llc|gmbh|plc|limited|corp|co)\b/g, "")
      .replace(/[^a-z0-9]/g, "");
  const key = `${norm(company)}|${norm(title)}|${country.toUpperCase()}`;
  return createHash("sha1").update(key).digest("hex");
}

export function normalizeJob(raw: RawJob): NormalizedJob {
  const description = stripHtml(raw.description || "");
  const country = normalizeCountry(raw.country, raw.location);
  const requirementsText = extractRequirements(description);
  const haystack = `${raw.title}\n${description}`;

  const skills = extractSkills(haystack);
  const reqText = (requirementsText || description).toLowerCase();
  const skillSlugs = skills.map((s) => {
    const near = new RegExp(
      `(require|must have|essential|strong|proficient)[^.\\n]{0,80}\\b${s.name.toLowerCase()}\\b|\\b${s.name.toLowerCase()}\\b[^.\\n]{0,40}(required|essential|a must)`,
      "i",
    );
    return {
      slug: s.slug,
      importance: (near.test(reqText) ? "REQUIRED" : "PREFERRED") as "REQUIRED" | "PREFERRED",
    };
  });
  // Guarantee at least the first few skills count as required.
  if (skillSlugs.length && !skillSlugs.some((s) => s.importance === "REQUIRED")) {
    skillSlugs.slice(0, 3).forEach((s) => (s.importance = "REQUIRED"));
  }

  const years = detectYears(haystack);

  return {
    externalId: raw.externalId,
    title: raw.title.trim(),
    company: raw.company.trim(),
    companyDomain: raw.companyDomain ?? null,
    location: raw.location?.trim() || null,
    country,
    workArrangement: normalizeArrangement(raw.remoteHint, raw.location, description),
    employmentType: raw.employmentType?.trim() || null,
    salaryMin: raw.salaryMin ?? null,
    salaryMax: raw.salaryMax ?? null,
    salaryCurrency: raw.salaryCurrency ?? (country === "GB" ? "GBP" : "USD"),
    description,
    requirementsText,
    skillSlugs,
    seniorityLevel: detectSeniority(raw.title, description),
    minYearsRequired: years.min,
    maxYearsRequired: years.max,
    url: raw.url,
    postedAt: raw.postedAt ? new Date(raw.postedAt) : null,
    fingerprint: fingerprintJob(raw.company, raw.title, country),
  };
}
