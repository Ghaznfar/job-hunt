import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getMatch } from "@/services/matching.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { AnalyzeButton } from "@/features/matching/components/analyze-button";
import { MatchAnalysis, type MatchView } from "@/features/matching/components/match-analysis";

export const metadata: Metadata = { title: "Match Analysis", robots: { index: false } };

export default async function MatchPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await requireUser();

  const [job, match, resumeCount, profile] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, company: true },
    }),
    getMatch(user.id, jobId),
    prisma.resume.count({ where: { userId: user.id } }),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { onboardingCompletedAt: true },
    }),
  ]);
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        href={`/dashboard/jobs/${jobId}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to job
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
        <p className="text-muted-foreground">{job.company}</p>
      </div>

      {!profile?.onboardingCompletedAt ? (
        <EmptyState
          title="Finish your profile first"
          description="Match scoring needs your target roles, experience and work eligibility."
          action={
            <Button asChild>
              <Link href="/dashboard/onboarding">Complete setup</Link>
            </Button>
          }
        />
      ) : resumeCount === 0 ? (
        <EmptyState
          icon={FileText}
          title="Upload a CV to analyze this job"
          description="We match against your real experience and skills — not just your profile."
          action={
            <Button asChild>
              <Link href="/dashboard/resumes">Upload CV</Link>
            </Button>
          }
        />
      ) : !match ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <p className="text-muted-foreground max-w-sm text-sm">
              Run a match analysis to score this role across technical fit, experience, location,
              salary, seniority and eligibility — and get a clear Apply / Maybe / Don&apos;t Apply
              verdict.
            </p>
            <AnalyzeButton jobId={jobId} />
          </CardContent>
        </Card>
      ) : (
        <MatchAnalysis
          view={
            {
              jobId,
              jobTitle: job.title,
              company: job.company,
              overallScore: match.overallScore,
              verdict: match.verdict,
              recommendation: match.recommendation,
              reasons: match.reasons,
              concerns: match.concerns,
              scores: {
                technical: match.technicalScore,
                experience: match.experienceScore,
                location: match.locationScore,
                salary: match.salaryScore,
                seniority: match.seniorityScore,
                eligibility: match.eligibilityScore,
              },
              skillScores: (match.skillScores as unknown as MatchView["skillScores"]) ?? [],
              strongMatches: match.strongMatches,
              missingSkills: match.missingSkills,
              updatedAt: match.updatedAt.toISOString(),
            } satisfies MatchView
          }
        />
      )}
    </div>
  );
}
