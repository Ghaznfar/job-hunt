import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getResumeDetail, versionToStructured } from "@/services/resume.service";
import { SKILL_TAXONOMY } from "@/lib/skills/taxonomy";
import { ResumeDetailClient } from "@/features/resumes/components/resume-detail-client";

export const metadata: Metadata = { title: "Edit CV" };

export default async function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const resume = await getResumeDetail(user.id, id);
  if (!resume) notFound();

  const versions = resume.versions.map((v) => ({
    id: v.id,
    label: v.label,
    source: v.source,
    isCurrent: v.isCurrent,
    createdAt: v.createdAt.toISOString(),
    structured: versionToStructured(v),
  }));

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/resumes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All CVs
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{resume.name}</h1>
        <p className="text-muted-foreground">
          Edit the parsed content. The version marked &ldquo;current&rdquo; is used for matching and
          tailoring.
        </p>
      </div>

      <ResumeDetailClient
        resumeId={resume.id}
        versions={versions}
        skillSuggestions={SKILL_TAXONOMY.map((s) => s.name)}
      />
    </div>
  );
}
