import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { ArrowRight, FileText, Search } from "lucide-react";

export const metadata: Metadata = { title: "Overview" };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function OverviewPage() {
  const user = await requireUser();
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { onboardingCompletedAt: true },
  });

  const [resumeCount, savedCount, applicationCount, skillCount] = await Promise.all([
    prisma.resume.count({ where: { userId: user.id } }),
    prisma.savedJob.count({ where: { userId: user.id } }),
    prisma.application.count({ where: { userId: user.id } }),
    prisma.userSkill.count({ where: { userId: user.id } }),
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

      {!profile?.onboardingCompletedAt ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Finish setting up your profile</p>
              <p className="text-sm text-muted-foreground">
                It takes two minutes and unlocks accurate job matching.
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
          { label: "CVs", value: resumeCount },
          { label: "Saved jobs", value: savedCount },
          { label: "Applications", value: applicationCount },
          { label: "Skills on profile", value: skillCount },
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Next step</CardTitle>
          </CardHeader>
          <CardContent>
            {resumeCount === 0 ? (
              <EmptyState
                icon={FileText}
                title="Upload your CV"
                description="Parsing your CV lets JobHunt match you against real job requirements."
                action={
                  <Button asChild>
                    <Link href="/dashboard/resumes">Upload CV</Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Search}
                title="Find jobs worth applying to"
                description="Search live roles and get a match score and an Apply / Maybe / Don't Apply verdict."
                action={
                  <Button asChild>
                    <Link href="/dashboard/jobs">Search jobs</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Search}
              title="No recommendations yet"
              description="Once you've set target roles and uploaded a CV, your best matches show up here."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
