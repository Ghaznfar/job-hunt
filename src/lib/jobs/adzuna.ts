import { env, isAdzunaConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { JobProvider } from "./provider";
import type { RawJob, ProviderSearchParams } from "./types";

/**
 * Adzuna official API adapter — https://developer.adzuna.com/
 * ToS-compliant: uses the documented JSON search endpoint with an app id/key.
 * Disabled unless ADZUNA_APP_ID and ADZUNA_APP_KEY are set.
 */
export class AdzunaJobProvider implements JobProvider {
  readonly key = "adzuna";

  isConfigured() {
    return isAdzunaConfigured;
  }

  private endpoint(country: string, page: number) {
    const c = country.toLowerCase() === "us" ? "us" : "gb";
    return `https://api.adzuna.com/v1/api/jobs/${c}/search/${page}`;
  }

  async fetch(params: ProviderSearchParams): Promise<RawJob[]> {
    if (!this.isConfigured()) return [];
    const countries = params.country ? [params.country] : ["US", "GB"];
    const results: RawJob[] = [];
    const perCountry = Math.ceil((params.limit ?? 50) / countries.length);

    for (const country of countries) {
      const url = new URL(this.endpoint(country, 1));
      url.searchParams.set("app_id", env.ADZUNA_APP_ID);
      url.searchParams.set("app_key", env.ADZUNA_APP_KEY);
      url.searchParams.set("results_per_page", String(Math.min(perCountry, 50)));
      url.searchParams.set("what", params.query || "engineer");
      url.searchParams.set("content-type", "application/json");
      url.searchParams.set("max_days_old", "30");
      if (params.remoteOnly) url.searchParams.set("what_or", "remote");

      try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) {
          logger.warn({ status: res.status, country }, "adzuna fetch failed");
          continue;
        }
        const body = (await res.json()) as { results?: AdzunaResult[] };
        for (const r of body.results ?? []) {
          results.push({
            externalId: `adzuna-${r.id}`,
            title: r.title?.replace(/<[^>]+>/g, "").trim() || "Untitled role",
            company: r.company?.display_name?.trim() || "Undisclosed",
            location: r.location?.display_name,
            country,
            remoteHint: `${r.title} ${r.description}`,
            employmentType: r.contract_time,
            salaryMin: r.salary_min ? Math.round(r.salary_min) : undefined,
            salaryMax: r.salary_max ? Math.round(r.salary_max) : undefined,
            salaryCurrency: country === "GB" ? "GBP" : "USD",
            description: r.description || "",
            url: r.redirect_url,
            postedAt: r.created,
          });
        }
      } catch (err) {
        logger.warn({ err: String(err), country }, "adzuna request error");
      }
    }
    return results;
  }
}

interface AdzunaResult {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  created: string;
  contract_time?: string;
  salary_min?: number;
  salary_max?: number;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
}
