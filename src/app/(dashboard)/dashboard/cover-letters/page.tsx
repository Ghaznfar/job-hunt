import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Cover Letters" };

export default async function Page() {
  await requireUser();
  return (
    <div>
      <PageHeader title="Cover Letters" />
      <EmptyState title="Coming together" description="This area is being built out in a later phase of the MVP." />
    </div>
  );
}
