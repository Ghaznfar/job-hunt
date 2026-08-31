import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { parseSearchParams } from "@/features/jobs/search";
import { searchJobs } from "@/features/jobs/queries";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { JobFilters } from "@/features/jobs/components/job-filters";
import { JobCard } from "@/features/jobs/components/job-card";
import { IngestButton } from "@/features/jobs/components/ingest-button";

export const metadata: Metadata = { title: "Job Search" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const input = parseSearchParams(sp);

  const [{ total, jobs, page, pageCount }, catalogCount, skillOptions] = await Promise.all([
    searchJobs(user.id, input),
    prisma.job.count(),
    prisma.skill.findMany({
      where: { jobSkills: { some: {} } },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const matches = jobs.length
    ? await prisma.jobMatch.findMany({
        where: { userId: user.id, jobId: { in: jobs.map((j) => j.id) } },
        orderBy: { createdAt: "desc" },
        select: { jobId: true, verdict: true, overallScore: true },
      })
    : [];
  const matchByJob = new Map(matches.map((m) => [m.jobId, m]));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, Array.isArray(v) ? v.join(",") : v);
    });
    params.set("page", String(p));
    return `/dashboard/jobs?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Job Search"
        description="Search live roles, then open one to see your match and an Apply / Maybe / Don't Apply verdict."
        action={user.role === "ADMIN" ? <IngestButton /> : undefined}
      />

      {catalogCount === 0 ? (
        <EmptyState
          icon={Search}
          title="No jobs in the catalog yet"
          description={
            user.role === "ADMIN"
              ? "Run the ingestion job to pull roles from the configured providers."
              : "Job ingestion hasn't run yet. Check back shortly."
          }
          action={user.role === "ADMIN" ? <IngestButton label="Run ingestion now" /> : undefined}
        />
      ) : (
        <>
          <JobFilters skillOptions={skillOptions} initial={sp} />

          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? "role" : "roles"} match your filters
          </p>

          {jobs.length === 0 ? (
            <EmptyState
              title="No roles match these filters"
              description="Try widening the country, experience band or removing a skill."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map((j) => {
                const m = matchByJob.get(j.id);
                return (
                  <JobCard
                    key={j.id}
                    job={{
                      id: j.id,
                      title: j.title,
                      company: j.company,
                      location: j.location,
                      country: j.country,
                      workArrangement: j.workArrangement,
                      salaryMin: j.salaryMin,
                      salaryMax: j.salaryMax,
                      salaryCurrency: j.salaryCurrency,
                      seniorityLevel: j.seniorityLevel,
                      minYearsRequired: j.minYearsRequired,
                      maxYearsRequired: j.maxYearsRequired,
                      postedAt: j.postedAt?.toISOString() ?? null,
                      isSaved: j.isSaved,
                      jobSkills: j.jobSkills,
                      verdict: m?.verdict ?? null,
                      matchScore: m?.overallScore ?? null,
                    }}
                  />
                );
              })}
            </div>
          )}

          {pageCount > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
                {page > 1 ? <Link href={pageHref(page - 1)}>Previous</Link> : <span>Previous</span>}
              </Button>
              <span className="text-muted-foreground text-sm">
                Page {page} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                asChild={page < pageCount}
              >
                {page < pageCount ? <Link href={pageHref(page + 1)}>Next</Link> : <span>Next</span>}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
