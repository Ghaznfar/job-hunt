import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SecurityCard } from "@/features/settings/components/security-card";
import { DangerZone } from "@/features/settings/components/danger-zone";
import { ThemeToggle } from "@/features/settings/components/theme-toggle";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [record, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { hashedPassword: true, email: true } }),
    prisma.subscription.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, security and subscription.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{record?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plan</span>
            <Badge variant={subscription?.plan === "PRO" ? "default" : "secondary"}>
              {subscription?.plan ?? "FREE"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {subscription?.plan === "PRO"
              ? "You're on Pro. Manage or cancel your subscription."
              : "Upgrade to Pro for CV tailoring, cover letters, interview prep and higher limits."}
          </p>
          <Button asChild variant={subscription?.plan === "PRO" ? "outline" : "default"}>
            <Link href="/dashboard/settings/billing">
              {subscription?.plan === "PRO" ? "Manage billing" : "Upgrade"}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <SecurityCard hasPassword={Boolean(record?.hashedPassword)} />
      <DangerZone />
    </div>
  );
}
