import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getBoard, getApplicationStats, createApplication } from "@/services/application.service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { KanbanSquare } from "lucide-react";
import { STATUS_ORDER } from "@/features/applications/constants";
import { KanbanBoard } from "@/features/applications/components/kanban-board";
import { AddApplicationDialog } from "@/features/applications/components/add-application-dialog";
import type { BoardCard } from "@/features/applications/components/application-card";
import type { ApplicationStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const user = await requireUser();
  const { add } = await searchParams;

  if (add) {
    const job = await prisma.job.findUnique({
      where: { id: add },
      select: { title: true, company: true, url: true, salaryMin: true, salaryMax: true, salaryCurrency: true },
    });
    if (job) {
      const salary =
        job.salaryMin || job.salaryMax
          ? `${job.salaryCurrency ?? ""} ${job.salaryMin ?? ""}${job.salaryMax ? `–${job.salaryMax}` : ""}`.trim()
          : undefined;
      await createApplication(user.id, {
        jobId: add,
        company: job.company,
        title: job.title,
        jobUrl: job.url,
        salary,
        status: "SAVED",
      });
    }
    redirect("/dashboard/applications");
  }

  const [apps, stats] = await Promise.all([
    getBoard(user.id),
    getApplicationStats(user.id),
  ]);

  const board = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, [] as BoardCard[]]),
  ) as Record<ApplicationStatus, BoardCard[]>;
  for (const a of apps) {
    board[a.status].push({
      id: a.id,
      company: a.company,
      title: a.title,
      salary: a.salary,
      nextInterviewAt: a.nextInterviewAt?.toISOString() ?? null,
      noteCount: a._count.notes,
      jobId: a.job?.id ?? null,
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Applications"
        description="Drag cards between columns to update status. Click a card to edit details, add notes and set interview dates."
        action={<AddApplicationDialog />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Applications", value: stats.total },
          { label: "Interviews", value: stats.interviews },
          { label: "Offers", value: stats.offers },
          { label: "Rejected", value: stats.rejected },
          { label: "Response rate", value: `${stats.responseRate}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {apps.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No applications tracked yet"
          description="Add one manually, or open a job and choose Track application."
          action={<AddApplicationDialog />}
        />
      ) : (
        <KanbanBoard initial={board} />
      )}
    </div>
  );
}
