import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getLatestSkillGapReport } from "@/services/skill-gap.service";
import { getUsageStatus } from "@/services/usage.service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { SkillGapPanel } from "@/features/skill-gaps/components/skill-gap-panel";

export const metadata: Metadata = { title: "Skill Gaps" };

export default async function SkillGapsPage() {
  const user = await requireUser();
  const [report, usage, profile] = await Promise.all([
    getLatestSkillGapReport(user.id),
    getUsageStatus(user.id, "SKILL_GAP"),
    prisma.profile.findUnique({ where: { userId: user.id }, select: { desiredTitles: true } }),
  ]);

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Skill Gaps"
        description="The skills most requested across your target roles, and where you stand."
      />

      {usage.locked ? (
        <EmptyState
          title="Skill-gap analysis is a Pro feature"
          action={
            <Button asChild>
              <Link href="/dashboard/settings/billing">Upgrade to Pro</Link>
            </Button>
          }
        />
      ) : !profile?.desiredTitles.length ? (
        <EmptyState
          title="Set your target roles first"
          description="Skill-gap analysis compares job demand against your skills for the roles you want."
          action={
            <Button asChild>
              <Link href="/dashboard/profile">Edit profile</Link>
            </Button>
          }
        />
      ) : (
        <SkillGapPanel initial={report} />
      )}
    </div>
  );
}
