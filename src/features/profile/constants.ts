export const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" },
  { code: "IN", name: "India" },
  { code: "AU", name: "Australia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SG", name: "Singapore" },
  { code: "OTHER", name: "Other" },
] as const;

export const TARGET_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
] as const;

export const WORK_PREFERENCES = [
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "Onsite" },
] as const;

export const WORK_AUTH_STATUSES = [
  { value: "CITIZEN", label: "Citizen" },
  { value: "PERMANENT_RESIDENT", label: "Permanent resident / settled" },
  { value: "VISA_HOLDER", label: "Have a work visa (no sponsorship needed)" },
  { value: "NEEDS_SPONSORSHIP", label: "Would need visa sponsorship" },
  { value: "NONE", label: "Not authorized to work here" },
] as const;

export type WorkAuthStatus = (typeof WORK_AUTH_STATUSES)[number]["value"];

export const CURRENCIES = ["USD", "GBP", "EUR", "CAD", "AUD"] as const;

export const COMMON_TITLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "DevOps Engineer",
  "Cloud Engineer",
  "Site Reliability Engineer",
  "Platform Engineer",
  "Data Engineer",
  "Security Engineer",
  "QA Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "Full Stack Engineer",
] as const;

export function countryName(code?: string | null): string {
  if (!code) return "—";
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
