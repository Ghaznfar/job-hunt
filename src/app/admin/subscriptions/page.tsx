import type { Metadata } from "next";
import { listSubscriptions } from "@/services/admin.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Admin · Subscriptions", robots: { index: false } };

export default async function AdminSubscriptionsPage() {
  const subs = await listSubscriptions();
  const pro = subs.filter((s) => s.plan === "PRO").length;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground text-sm">
          {pro} Pro · {subs.length - pro} Free
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Renews / ends</TableHead>
              <TableHead>Stripe customer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-muted-foreground text-xs">{s.user.email}</TableCell>
                <TableCell>
                  <Badge variant={s.plan === "PRO" ? "default" : "secondary"}>{s.plan}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{s.status}</Badge>
                  {s.cancelAtPeriodEnd ? (
                    <Badge variant="warning" className="ml-1 text-[10px]">
                      cancelling
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {s.currentPeriodEnd ? s.currentPeriodEnd.toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {s.stripeCustomerId ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
