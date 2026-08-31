import type { Metadata } from "next";
import { listJobSources } from "@/services/admin.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { relativeDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Job sources", robots: { index: false } };

export default async function AdminJobSourcesPage() {
  const sources = await listJobSources();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Job sources</h1>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Last run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.key}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>
                  <Badge variant={s.enabled ? "success" : "secondary"}>
                    {s.enabled ? "enabled" : "disabled"}
                  </Badge>
                </TableCell>
                <TableCell>{s._count.jobs}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {s.lastRunAt ? relativeDate(s.lastRunAt) : "never"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Enable/disable is controlled by the <code>JOB_PROVIDERS</code> env var and provider
        credentials (e.g. <code>ADZUNA_APP_ID</code>).
      </p>
    </div>
  );
}
