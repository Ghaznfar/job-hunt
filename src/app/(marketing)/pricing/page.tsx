import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRICING_COPY } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "JobHunt pricing. Start free with monthly limits, or go Pro for $9.99/month for CV tailoring, cover letters, interview prep and higher AI limits.",
  alternates: { canonical: "/pricing" },
};

const faqs = [
  [
    "Can I cancel anytime?",
    "Yes. Cancel from Settings → Billing; you keep Pro until the end of the paid period.",
  ],
  ["Do limits reset?", "Free plan limits reset on the 1st of each month."],
  ["What payment methods?", "All major cards via Stripe. Billing runs in test mode until launch."],
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Simple pricing</h1>
        <p className="text-muted-foreground mt-4">
          Start free. Upgrade when your search gets serious. No contracts.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
        {(["FREE", "PRO"] as const).map((id) => {
          const plan = PRICING_COPY[id];
          const pro = id === "PRO";
          return (
            <Card key={id} className={pro ? "border-primary shadow-md" : undefined}>
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  {pro ? <Badge>Most popular</Badge> : null}
                </div>
                <div>
                  <span className="text-4xl font-bold">{plan.price}</span>{" "}
                  <span className="text-muted-foreground text-sm">{plan.cadence}</span>
                </div>
                <p className="text-muted-foreground text-sm">{plan.blurb}</p>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="text-success mt-0.5 size-4 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={pro ? "default" : "outline"} asChild>
                  <Link href="/signup">{pro ? "Start free, upgrade later" : "Get started"}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="text-xl font-semibold">Pricing FAQ</h2>
        <div className="mt-4 divide-y">
          {faqs.map(([q, a]) => (
            <div key={q} className="py-4">
              <p className="font-medium">{q}</p>
              <p className="text-muted-foreground mt-1 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
