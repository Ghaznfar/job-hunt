import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getJobsWithInterviewPrep } from "@/services/interview.service";
import { getUsageStatus } from "@/services/usage.service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessagesSquare } from "lucide-react";
import { relativeDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Interview Preparation" };

export default async function InterviewsPage() {
  const user = await requireUser();
  const [jobsWithPrep, usage, candidateJobs] = await Promise.all([
    getJobsWithInterviewPrep(user.id),
    getUsageStatus(user.id, "INTERVIEW_PREP"),
    prisma.job.findMany({
      where: {
        OR: [
          { savedJobs: { some: { userId: user.id } } },
          { jobMatches: { some: { userId: user.id } } },
          { applications: { some: { userId: user.id } } },
        ],
        interviewQuestions: { none: { userId: user.id } },
      },
      select: { id: true, title: true, company: true },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interview Preparation"
        description="Job-specific questions across technical, scenario, behavioral, HR and role-specific themes — with AI feedback on your answers."
      />

      {usage.locked ? (
        <EmptyState
          title="Interview prep is a Pro feature"
          action={
            <Button asChild>
              <Link href="/dashboard/settings/billing">Upgrade to Pro</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {usage.remaining} of {usage.limit} AI generations left this month.
          </p>

          {jobsWithPrep.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-muted-foreground text-sm font-semibold">Your prep sets</h2>
              {jobsWithPrep.map((p) => (
                <Card key={p.job.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <Link
                        href={`/dashboard/interviews/${p.job.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.job.title}
                      </Link>
                      <p className="text-muted-foreground text-sm">
                        {p.job.company} · {p.count} questions · {relativeDate(p.updatedAt)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/interviews/${p.job.id}`}>Open</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <div className="space-y-3">
            <h2 className="text-muted-foreground text-sm font-semibold">Start prep for a job</h2>
            {candidateJobs.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="No jobs to prep for yet"
                description="Save or analyze a job, then generate a question set here."
                action={
                  <Button asChild>
                    <Link href="/dashboard/jobs">Find jobs</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {candidateJobs.map((j) => (
                  <Card key={j.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{j.title}</p>
                        <p className="text-muted-foreground truncate text-sm">{j.company}</p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/interviews/${j.id}`}>Prep</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
