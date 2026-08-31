import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Banknote,
  Clock,
  ExternalLink,
  ShieldCheck,
  Target,
} from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getJobForUser } from "@/features/jobs/queries";
import { ensureJobAnalyzed } from "@/services/job-analysis.service";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSalaryRange, relativeDate } from "@/lib/utils";
import { ARRANGEMENT_LABEL, COUNTRY_LABEL, seniorityLabel, experienceLabel } from "@/features/jobs/format";
import { SaveButton } from "@/features/jobs/components/save-button";
import { VerdictBadge } from "@/features/jobs/components/verdict-badge";
import { AnalyzeButton } from "@/features/matching/components/analyze-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id }, select: { title: true, company: true } });
  return { title: job ? `${job.title} · ${job.company}` : "Job", robots: { index: false } };
}

const SPONSOR_LABEL: Record<string, string> = {
  YES: "Sponsorship available",
  NO: "No visa sponsorship",
  UNKNOWN: "Sponsorship not stated",
};

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  await ensureJobAnalyzed(id);
  const result = await getJobForUser(user.id, id);
  if (!result) notFound();
  const { job, isSaved, application, match } = result;

  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const exp = experienceLabel(job.minYearsRequired, job.maxYearsRequired);
  const required = job.jobSkills.filter((s) => s.importance === "REQUIRED");
  const preferred = job.jobSkills.filter((s) => s.importance === "PREFERRED");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/jobs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to search
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="size-4" /> {job.company}
          </p>
        </div>
        <div className="flex gap-2">
          <SaveButton jobId={job.id} initialSaved={isSaved} />
          <Button asChild variant="outline">
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              Original <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4" />
          {job.location || COUNTRY_LABEL[job.country] || job.country} · {ARRANGEMENT_LABEL[job.workArrangement]}
        </span>
        {salary ? (
          <span className="flex items-center gap-1.5">
            <Banknote className="size-4" /> {salary}
          </span>
        ) : null}
        {job.seniorityLevel ? <span>{seniorityLabel(job.seniorityLevel)} level</span> : null}
        {exp ? <span>{exp} experience</span> : null}
        <span className="flex items-center gap-1.5">
          <Clock className="size-4" /> Posted {relativeDate(job.postedAt ?? job.createdAt)}
        </span>
      </div>

      {/* Match / Should I Apply */}
      <Card className="border-primary/30">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-4" /> Should I apply?
          </CardTitle>
          {match ? <VerdictBadge verdict={match.verdict} score={match.overallScore} size="lg" /> : null}
        </CardHeader>
        <CardContent>
          {match ? (
            <div className="space-y-3">
              <p className="text-sm">{match.recommendation}</p>
              <Button asChild size="sm">
                <Link href={`/dashboard/match/${job.id}`}>View full breakdown</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Run a match analysis to score this role against your profile and CV, and get a clear
                verdict.
              </p>
              <AnalyzeButton jobId={job.id} size="sm" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" /> Eligibility signals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Work authorization required</span>
            <span>
              {job.requiresWorkAuthorization.length
                ? job.requiresWorkAuthorization.map((c) => COUNTRY_LABEL[c] ?? c).join(", ")
                : "Not stated"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Visa sponsorship</span>
            <span>{SPONSOR_LABEL[job.sponsorshipAvailable]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Work arrangement</span>
            <span>{ARRANGEMENT_LABEL[job.workArrangement]}</span>
          </div>
          {job.extractionConfidence != null ? (
            <p className="pt-1 text-xs text-muted-foreground">
              These signals are extracted from the posting text (confidence{" "}
              {Math.round(job.extractionConfidence * 100)}%). Always confirm with the employer.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {required.length ? (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Required
              </p>
              <div className="flex flex-wrap gap-1.5">
                {required.map((s) => (
                  <Badge key={s.skill.slug}>{s.skill.name}</Badge>
                ))}
              </div>
            </div>
          ) : null}
          {preferred.length ? (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Preferred
              </p>
              <div className="flex flex-wrap gap-1.5">
                {preferred.map((s) => (
                  <Badge key={s.skill.slug} variant="outline">
                    {s.skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {job.jobSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No specific skills detected in this posting.</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {job.description}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/dashboard/applications?add=${job.id}`}>
            {application ? `Tracked · ${application.status}` : "Track application"}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/resumes/tailor/${job.id}`}>Tailor CV</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/cover-letters?job=${job.id}`}>Cover letter</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/interviews/${job.id}`}>Interview prep</Link>
        </Button>
      </div>
    </div>
  );
}
