import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getCoverLettersForUser } from "@/services/cover-letter.service";
import { getUsageStatus } from "@/services/usage.service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { CoverLetterComposer } from "@/features/cover-letters/components/cover-letter-composer";
import { CoverLetterList } from "@/features/cover-letters/components/cover-letter-list";

export const metadata: Metadata = { title: "Cover Letters" };

export default async function CoverLettersPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const user = await requireUser();
  const { job } = await searchParams;

  const [letters, usage, relevantJobs] = await Promise.all([
    getCoverLettersForUser(user.id),
    getUsageStatus(user.id, "COVER_LETTER"),
    prisma.job.findMany({
      where: {
        OR: [
          { savedJobs: { some: { userId: user.id } } },
          { jobMatches: { some: { userId: user.id } } },
          { applications: { some: { userId: user.id } } },
          ...(job ? [{ id: job }] : []),
        ],
      },
      select: { id: true, title: true, company: true },
      take: 50,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cover Letters"
        description="Generate a concise, specific cover letter grounded in your CV and the job."
      />

      {usage.locked ? (
        <EmptyState
          title="Cover letters are a Pro feature"
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
          <CoverLetterComposer jobs={relevantJobs} initialJobId={job} />
        </>
      )}

      {letters.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No cover letters yet"
          description="Generate one above for a job you've saved or analyzed."
        />
      ) : (
        <CoverLetterList
          items={letters.map((l) => ({
            id: l.id,
            content: l.content,
            tone: l.tone,
            updatedAt: l.updatedAt.toISOString(),
            job: l.job,
          }))}
        />
      )}
    </div>
  );
}
