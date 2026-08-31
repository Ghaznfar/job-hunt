import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getUsageStatus } from "@/services/usage.service";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { TailorWorkbench } from "@/features/tailoring/components/tailor-workbench";

export const metadata: Metadata = { title: "Tailor CV", robots: { index: false } };

export default async function TailorPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await requireUser();

  const [job, defaultResume, usage] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, company: true },
    }),
    prisma.resume.findFirst({
      where: { userId: user.id, isDefault: true },
      select: { id: true, name: true },
    }),
    getUsageStatus(user.id, "CV_TAILOR"),
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
        <h1 className="text-2xl font-bold tracking-tight">Tailor your CV</h1>
        <p className="text-muted-foreground">
          {job.title} · {job.company}
        </p>
      </div>

      {usage.locked ? (
        <EmptyState
          title="CV tailoring is a Pro feature"
          description="Upgrade to tailor your CV for specific roles with a reviewable diff."
          action={
            <Button asChild>
              <Link href="/dashboard/settings/billing">Upgrade to Pro</Link>
            </Button>
          }
        />
      ) : usage.remaining <= 0 ? (
        <EmptyState
          title="You've used your AI generations this month"
          description={`Limit is ${usage.limit}. It resets on the 1st.`}
        />
      ) : !defaultResume ? (
        <EmptyState
          icon={FileText}
          title="No CV to tailor"
          description="Upload a CV and set it as default first."
          action={
            <Button asChild>
              <Link href="/dashboard/resumes">Go to CVs</Link>
            </Button>
          }
        />
      ) : (
        <TailorWorkbench jobId={job.id} jobTitle={job.title} resumeName={defaultResume.name} />
      )}
    </div>
  );
}
