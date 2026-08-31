/** Raw job as returned by a provider adapter, before normalization. */
export interface RawJob {
  /** Stable id within the provider. */
  externalId: string;
  title: string;
  company: string;
  companyDomain?: string;
  location?: string;
  /** ISO-3166 alpha-2, if the provider gives it. */
  country?: string;
  /** Free text; normalizer maps to REMOTE/HYBRID/ONSITE/UNKNOWN. */
  remoteHint?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  url: string;
  postedAt?: string | Date;
}

export interface NormalizedJob {
  externalId: string;
  title: string;
  company: string;
  companyDomain: string | null;
  location: string | null;
  country: string;
  workArrangement: "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string;
  requirementsText: string | null;
  skillSlugs: { slug: string; importance: "REQUIRED" | "PREFERRED" }[];
  seniorityLevel: string | null;
  minYearsRequired: number | null;
  maxYearsRequired: number | null;
  url: string;
  postedAt: Date | null;
  fingerprint: string;
}

export interface ProviderSearchParams {
  query?: string;
  country?: string; // "US" | "GB"
  remoteOnly?: boolean;
  limit?: number;
}
