import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { getMatchesForUser } from "@/services/matching.service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";
import { ARRANGEMENT_LABEL } from "@/features/jobs/format";
import { VerdictBadge } from "@/features/jobs/components/verdict-badge";

export const metadata: Metadata = { title: "Match Analysis" };

export default async function MatchIndexPage() {
  const user = await requireUser();
  const matches = await getMatchesForUser(user.id);

  return (
    <div>
      <PageHeader
        title="Match Analysis"
        description="Every job you've analyzed, ranked by overall match."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/jobs">Find more jobs</Link>
          </Button>
        }
      />

      {matches.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No analyses yet"
          description="Open a job and run a match analysis to see it here."
          action={
            <Button asChild>
              <Link href="/dashboard/jobs">Browse jobs</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <Card key={m.id} className="transition-shadow hover:shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/match/${m.job.id}`}
                    className="font-medium hover:underline"
                  >
                    {m.job.title}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {m.job.company} · {m.job.country} · {ARRANGEMENT_LABEL[m.job.workArrangement]}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <VerdictBadge verdict={m.verdict} score={m.overallScore} />
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/dashboard/match/${m.job.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
