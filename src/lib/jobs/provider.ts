import { env } from "@/lib/env";
import type { RawJob, ProviderSearchParams } from "./types";
import { MockJobProvider } from "./mock";
import { AdzunaJobProvider } from "./adzuna";

export interface JobProvider {
  readonly key: string;
  /** True when the provider has whatever credentials it needs. */
  isConfigured(): boolean;
  /** Fetch a batch of jobs for ingestion (broad) or search (params). */
  fetch(params: ProviderSearchParams): Promise<RawJob[]>;
}

export function getJobProviders(): JobProvider[] {
  const enabled = env.JOB_PROVIDERS.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const all: JobProvider[] = [new MockJobProvider(), new AdzunaJobProvider()];
  const selected = all.filter((p) => enabled.includes(p.key) && p.isConfigured());
  // Always keep at least the mock provider so the app is never empty.
  return selected.length ? selected : [new MockJobProvider()];
}
