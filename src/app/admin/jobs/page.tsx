import type { Metadata } from "next";
import { listRecentJobs } from "@/services/admin.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { relativeDate } from "@/lib/utils";
import { IngestNowButton } from "@/features/admin/components/ingest-now-button";

export const metadata: Metadata = { title: "Admin · Jobs", robots: { index: false } };

export default async function AdminJobsPage() {
  const jobs = await listRecentJobs();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
        <IngestNowButton />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Skills</TableHead>
              <TableHead>Matches</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-medium">{j.title}</TableCell>
                <TableCell>{j.company}</TableCell>
                <TableCell>{j.country} · {j.workArrangement.toLowerCase()}</TableCell>
                <TableCell>{j.source.key}</TableCell>
                <TableCell>{j._count.jobSkills}</TableCell>
                <TableCell>{j._count.jobMatches}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{relativeDate(j.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
