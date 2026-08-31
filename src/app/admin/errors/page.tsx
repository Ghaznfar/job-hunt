import type { Metadata } from "next";
import { listErrors } from "@/services/admin.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { relativeDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Errors", robots: { index: false } };

const LEVEL_VARIANT: Record<string, "destructive" | "warning" | "secondary"> = {
  ERROR: "destructive",
  WARN: "warning",
  INFO: "secondary",
  DEBUG: "secondary",
};

export default async function AdminErrorsPage() {
  const errors = await listErrors();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">System errors</h1>
      {errors.length === 0 ? (
        <EmptyState
          title="No logged errors"
          description="Nothing has been recorded to the error log."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Badge variant={LEVEL_VARIANT[e.level] ?? "secondary"}>{e.level}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{e.source ?? "—"}</TableCell>
                  <TableCell className="max-w-md truncate text-sm">{e.message}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {relativeDate(e.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
