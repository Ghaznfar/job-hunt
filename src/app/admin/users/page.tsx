import type { Metadata } from "next";
import { listUsers } from "@/services/admin.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { relativeDate } from "@/lib/utils";
import { UserRowActions } from "@/features/admin/components/user-row-actions";

export const metadata: Metadata = { title: "Admin · Users", robots: { index: false } };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await listUsers(q);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <form>
        <Input name="q" defaultValue={q} placeholder="Search by email or name" className="max-w-xs" />
      </form>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className={u.disabledAt ? "opacity-60" : ""}>
                <TableCell>
                  <div className="font-medium">{u.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                  {!u.emailVerified ? (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      unverified
                    </Badge>
                  ) : null}
                  {u.disabledAt ? (
                    <Badge variant="destructive" className="mt-1 text-[10px]">
                      disabled
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant={u.subscription?.plan === "PRO" ? "default" : "secondary"}>
                    {u.subscription?.plan ?? "FREE"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === "ADMIN" ? "destructive" : "outline"}>{u.role}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u._count.applications} apps · {u._count.resumes} CVs · {u._count.jobMatches} matches
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {relativeDate(u.createdAt)}
                </TableCell>
                <TableCell>
                  <UserRowActions userId={u.id} role={u.role} disabled={Boolean(u.disabledAt)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
