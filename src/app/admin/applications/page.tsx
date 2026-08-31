import type { Metadata } from "next";
import { listApplicationsAdmin } from "@/services/admin.service";
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
import { STATUS_LABEL } from "@/features/applications/constants";

export const metadata: Metadata = { title: "Admin · Applications", robots: { index: false } };

export default async function AdminApplicationsPage() {
  const apps = await listApplicationsAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs text-muted-foreground">{a.user.email}</TableCell>
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell>{a.company}</TableCell>
                <TableCell>
                  <Badge variant="outline">{STATUS_LABEL[a.status]}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{relativeDate(a.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
