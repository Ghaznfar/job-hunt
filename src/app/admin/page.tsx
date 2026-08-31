import type { Metadata } from "next";
import { getAdminMetrics } from "@/services/admin.service";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
        {sub ? <p className="text-muted-foreground mt-1 text-xs">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const m = await getAdminMetrics();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      <section>
        <h2 className="text-muted-foreground mb-2 text-sm font-semibold">Users</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Total users" value={m.users.total} />
          <Stat label="New (7d)" value={m.users.new7d} />
          <Stat label="Active (30d)" value={m.users.active30d} />
          <Stat label="Free" value={m.users.free} />
          <Stat label="Pro" value={m.users.pro} />
        </div>
      </section>

      <section>
        <h2 className="text-muted-foreground mb-2 text-sm font-semibold">Activity</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Jobs in catalog"
            value={m.jobs.total}
            sub={`${m.jobs.withSkills} with skills`}
          />
          <Stat label="Applications" value={m.applications} />
          <Stat label="Match analyses" value={m.matches} />
          <Stat label="Errors (7d)" value={m.errors7d} />
        </div>
      </section>

      <section>
        <h2 className="text-muted-foreground mb-2 text-sm font-semibold">AI (last 30 days)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Requests" value={m.ai.requests30d} />
          <Stat label="Est. cost" value={`$${m.ai.costUsd30d}`} />
          <Stat label="Tokens" value={m.ai.tokens30d.toLocaleString()} />
          <Stat label="AI errors (7d)" value={m.ai.errors7d} />
        </div>
      </section>
    </div>
  );
}
