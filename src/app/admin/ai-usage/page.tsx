import type { Metadata } from "next";
import { getAIUsage } from "@/services/admin.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { relativeDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · AI usage", robots: { index: false } };

export default async function AdminAIUsagePage() {
  const { recent, byFeature } = await getAIUsage();

  const summary = new Map<string, { ok: number; error: number; cents: number }>();
  for (const row of byFeature) {
    const s = summary.get(row.feature) ?? { ok: 0, error: 0, cents: 0 };
    if (row.status === "OK") s.ok += row._count;
    else s.error += row._count;
    s.cents += row._sum.costCents ?? 0;
    summary.set(row.feature, s);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">AI usage</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...summary.entries()].map(([feature, s]) => (
          <Card key={feature}>
            <CardContent className="p-4">
              <p className="font-medium">{feature}</p>
              <p className="text-sm text-muted-foreground">
                {s.ok} ok · {s.error} errors · ${(s.cents / 100).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Feature</TableHead>
              <TableHead>Provider / model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">{r.user?.email ?? "—"}</TableCell>
                <TableCell>{r.feature}</TableCell>
                <TableCell className="text-xs">
                  {r.provider} / {r.model}
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "OK" ? "success" : "destructive"}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">{r.latencyMs ?? "—"}ms</TableCell>
                <TableCell className="text-xs">
                  {r.costCents != null ? `$${(r.costCents / 100).toFixed(3)}` : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{relativeDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
