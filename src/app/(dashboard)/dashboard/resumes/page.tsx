import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { getResumesForUser } from "@/services/resume.service";
import { getUsageStatus } from "@/services/usage.service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { FileText } from "lucide-react";
import { UploadDialog } from "@/features/resumes/components/upload-dialog";
import { ResumeList } from "@/features/resumes/components/resume-list";
import { CreateBlankButton } from "@/features/resumes/components/create-blank-button";

export const metadata: Metadata = { title: "CV / Resume" };

export default async function ResumesPage() {
  const user = await requireUser();
  const [resumes, usage] = await Promise.all([
    getResumesForUser(user.id),
    getUsageStatus(user.id, "CV_ANALYSIS"),
  ]);

  const rows = resumes.map((r) => ({
    id: r.id,
    name: r.name,
    isDefault: r.isDefault,
    fileType: r.fileType,
    hasFile: Boolean(r.fileKey),
    updatedAt: r.updatedAt.toISOString(),
    versionCount: r._count.versions,
  }));

  return (
    <div>
      <PageHeader
        title="CV / Resume"
        description="Upload and maintain multiple CV versions. The default is used for job matching."
        action={
          <div className="flex gap-2">
            <CreateBlankButton />
            <UploadDialog />
          </div>
        }
      />

      {usage.remaining <= 0 ? (
        <p className="border-warning/40 bg-warning/10 mb-4 rounded-md border px-3 py-2 text-sm">
          You&apos;ve used all {usage.limit} CV analyses this month. Uploading a new CV is paused
          until the 1st, or upgrade to Pro.
        </p>
      ) : (
        <p className="text-muted-foreground mb-4 text-sm">
          {usage.remaining} of {usage.limit} CV analyses left this month.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No CVs yet"
          description="Upload your CV to unlock job matching, tailoring and interview prep."
          action={<UploadDialog />}
        />
      ) : (
        <ResumeList resumes={rows} />
      )}
    </div>
  );
}
