import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getBillingOverview } from "@/services/billing.service";
import { getAllUsage } from "@/services/usage.service";
import { PRICING_COPY } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UpgradeButton, ManageBillingButton } from "@/features/billing/components/billing-actions";

export const metadata: Metadata = { title: "Billing" };

const FEATURE_LABEL: Record<string, string> = {
  JOB_MATCH: "Job match analyses",
  CV_ANALYSIS: "CV analyses",
  CV_TAILOR: "CV tailoring",
  COVER_LETTER: "Cover letters",
  INTERVIEW_PREP: "Interview prep",
  SKILL_GAP: "Skill-gap analyses",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireUser();
  const { checkout } = await searchParams;
  const [overview, usage] = await Promise.all([
    getBillingOverview(user.id),
    getAllUsage(user.id),
  ]);
  const isPro = overview.plan === "PRO";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your plan and see your usage this month.</p>
      </div>

      {checkout === "success" ? (
        <Alert variant="success">
          <AlertDescription>Payment received — welcome to Pro.</AlertDescription>
        </Alert>
      ) : checkout === "cancelled" ? (
        <Alert>
          <AlertDescription>Checkout cancelled. You&apos;re still on the Free plan.</AlertDescription>
        </Alert>
      ) : null}

      {!overview.stripeConfigured ? (
        <Alert variant="warning">
          <AlertDescription>
            {overview.devBypass
              ? "Stripe isn't configured. In development you can activate Pro instantly to test gated features."
              : "Stripe isn't configured. Set STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID and STRIPE_WEBHOOK_SECRET to enable paid billing."}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Current plan</CardTitle>
          <Badge variant={isPro ? "default" : "secondary"}>{overview.plan}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPro ? (
            <>
              <p className="text-sm text-muted-foreground">
                {overview.cancelAtPeriodEnd
                  ? `Your Pro plan ends on ${overview.currentPeriodEnd?.toLocaleDateString()}.`
                  : overview.currentPeriodEnd
                    ? `Renews on ${overview.currentPeriodEnd.toLocaleDateString()}.`
                    : "Pro plan active."}
              </p>
              {overview.stripeConfigured ? <ManageBillingButton /> : null}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Upgrade to unlock CV tailoring, cover letters, interview prep, skill-gap analysis and
                much higher AI limits.
              </p>
              <UpgradeButton devBypass={overview.devBypass} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage this month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {usage.map((u) => (
            <div key={u.feature}>
              <div className="mb-1 flex justify-between text-sm">
                <span>
                  {FEATURE_LABEL[u.feature] ?? u.feature}
                  {u.locked ? <Badge variant="outline" className="ml-2 text-[10px]">Pro</Badge> : null}
                </span>
                <span className="text-muted-foreground">
                  {u.locked ? "—" : `${u.used} / ${u.limit}`}
                </span>
              </div>
              <Progress value={u.locked ? 0 : Math.min(100, (u.used / Math.max(u.limit, 1)) * 100)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {!isPro ? (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>Pro — {PRICING_COPY.PRO.price}/mo</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {PRICING_COPY.PRO.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Full plan comparison is on the <Link href="/pricing" className="underline">pricing page</Link>.
      </p>
    </div>
  );
}
