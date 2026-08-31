import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Search, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getDashboardData } from "@/services/dashboard.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/empty-state";
import { VerdictBadge } from "@/features/jobs/components/verdict-badge";

export const metadata: Metadata = { title: "Overview" };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function OverviewPage() {
  const user = await requireUser();
  const [data, resumeCount] = await Promise.all([
    getDashboardData(user.id),
    prisma.resume.count({ where: { userId: user.id } }),
  ]);
  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}, {firstName}
        </h1>
        <p className="text-muted-foreground">Here&apos;s where your job hunt stands.</p>
      </div>

      {!data.onboarded ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Finish setting up your profile</p>
              <p className="text-sm text-muted-foreground">
                Two minutes, and it unlocks accurate job matching.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/onboarding">
                Continue setup <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Applications", value: data.stats.applications },
          { label: "Interviews", value: data.stats.interviews },
          { label: "Saved jobs", value: data.stats.savedJobs },
          {
            label: "Avg. match",
            value: data.stats.avgMatch != null ? `${data.stats.avgMatch}%` : "—",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recommended jobs</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/jobs">Browse all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {resumeCount === 0 ? (
              <EmptyState
                icon={FileText}
                title="Upload your CV to get recommendations"
                description="Matching needs your real experience and skills."
                action={
                  <Button asChild>
                    <Link href="/dashboard/resumes">Upload CV</Link>
                  </Button>
                }
              />
            ) : data.recommended.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No recommendations yet"
                description="Analyze a few jobs and your best matches will appear here."
                action={
                  <Button asChild>
                    <Link href="/dashboard/jobs">Find jobs</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {data.recommended.map((r) => (
                  <li key={r.jobId} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/match/${r.jobId}`}
                        className="font-medium hover:underline"
                      >
                        {r.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">{r.company}</p>
                    </div>
                    {r.verdict ? (
                      <VerdictBadge verdict={r.verdict} score={r.score} />
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/match/${r.jobId}`}>Analyze</Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" /> Skill gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.skillGap.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Set target roles in your profile to see the skills most in demand.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.skillGap.map((s) => (
                  <li key={s.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {s.name}
                        {s.have ? (
                          <Badge variant="success" className="text-[10px]">
                            have
                          </Badge>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.count} roles</span>
                    </div>
                    <Progress
                      value={Math.min(100, (s.count / (data.skillGap[0]?.count || 1)) * 100)}
                      indicatorClassName={s.have ? "bg-success" : "bg-primary"}
                    />
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
              <Link href="/dashboard/skill-gaps">Full analysis</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
