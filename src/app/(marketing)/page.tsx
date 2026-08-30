import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CheckCircle2,
  Target,
  FileText,
  MessagesSquare,
  KanbanSquare,
  ShieldCheck,
  Sparkles,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { targetRoles } from "@/lib/brand";

export const metadata: Metadata = {
  title: "JobHunt — Know which tech jobs are worth applying to",
  description:
    "AI job matching, CV tailoring, cover letters and interview prep for software, DevOps, cloud, SRE, data, security and QA engineers in the US and UK. Stop applying blindly.",
  alternates: { canonical: "/" },
};

const steps = [
  {
    title: "Upload your CV",
    body: "PDF or DOCX. We parse it into structured experience, skills and education you can edit.",
  },
  {
    title: "Set your targets",
    body: "Target roles, countries, remote preference, salary and work authorization.",
  },
  {
    title: "Find real matches",
    body: "Search live roles and get a match score against your actual profile — not keywords.",
  },
  {
    title: "Get a verdict",
    body: "Apply, Maybe or Don't Apply — with the specific reasons behind it.",
  },
];

const features = [
  {
    icon: Target,
    title: "Job matching that respects reality",
    body: "Technical fit, experience, location, salary, seniority and eligibility scored separately — then combined. Deterministic rules first, AI for explanation.",
  },
  {
    icon: ShieldCheck,
    title: "Eligibility & sponsorship checks",
    body: "Work authorization and visa sponsorship are first-class inputs. A role that can't hire you shouldn't waste your time.",
  },
  {
    icon: FileText,
    title: "CV tailoring without fabrication",
    body: "Rewrites wording and surfaces relevant experience for a specific job. It will never invent employers, skills, dates or certifications.",
  },
  {
    icon: Sparkles,
    title: "Cover letters in your voice",
    body: "Concise, specific, grounded in your CV and the job description. Regenerate, edit, copy or save.",
  },
  {
    icon: MessagesSquare,
    title: "Interview preparation",
    body: "Technical, scenario, behavioral, HR and job-specific questions. Answer them, get feedback and a stronger version.",
  },
  {
    icon: KanbanSquare,
    title: "Application tracking",
    body: "A Kanban board from Saved to Offer, with notes, contacts, interview dates and response-rate stats.",
  },
];

const faqs = [
  {
    q: "Where do the jobs come from?",
    a: "JobHunt uses a modular provider architecture with legitimate job APIs. It ships with a fully functional demo dataset, and connects to the Adzuna API (US & UK) when credentials are configured. We do not scrape sites in violation of their terms.",
  },
  {
    q: "Will the AI lie on my CV?",
    a: "No. Every AI feature is constrained to facts already in your profile or CV. Tailoring is shown as a diff — original, improved, and the reason — and you approve each change. A post-check rejects any claim not backed by your data.",
  },
  {
    q: "Is my CV private?",
    a: "Yes. Uploaded files are stored privately and served only through short-lived signed links. We never expose them publicly and never log their contents. You can delete your account and all associated data at any time.",
  },
  {
    q: "Which roles and countries do you support?",
    a: "The MVP targets software, DevOps, cloud, SRE, data, security and QA engineers in the United States and United Kingdom.",
  },
  {
    q: "How much does it cost?",
    a: "Free covers the core workflow with monthly limits. Pro is $9.99/month for higher limits, CV tailoring, cover letters, interview prep and skill-gap analysis.",
  },
];

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {sub ? <p className="mt-4 text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              For US &amp; UK tech professionals
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Find the jobs worth applying to.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              AI-powered job matching, CV tailoring, application tracking and interview preparation
              for ambitious tech professionals. Stop applying to hundreds of jobs blindly.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start for free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/how-it-works">See how it works</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required. Free plan covers the full workflow.
            </p>
          </div>

          {/* Verdict preview */}
          <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              {
                icon: CheckCircle2,
                tone: "text-success",
                label: "APPLY",
                text: "Strong technical fit, experience in range, remote-eligible.",
              },
              {
                icon: AlertTriangle,
                tone: "text-warning",
                label: "MAYBE",
                text: "Good fit but limited Kubernetes exposure and salary at the edge.",
              },
              {
                icon: XCircle,
                tone: "text-destructive",
                label: "DON'T APPLY",
                text: "Requires US work authorization and 5+ years. Onsite only.",
              },
            ].map((v) => (
              <Card key={v.label}>
                <CardContent className="space-y-2 p-5">
                  <div className={`flex items-center gap-2 font-semibold ${v.tone}`}>
                    <v.icon className="size-5" />
                    {v.label}
                  </div>
                  <p className="text-sm text-muted-foreground">{v.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="From CV to confident application in minutes"
            sub="A guided workflow that keeps every application high quality."
          />
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-xl border bg-card p-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to apply smarter"
            sub="Purpose-built for engineers, not a generic job board."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title}>
                <CardContent className="space-y-3 p-6">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Audience */}
      <section className="border-b bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Built for these roles first</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {targetRoles.map((r) => (
              <Badge key={r} variant="outline" className="px-3 py-1 text-sm">
                {r}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Pricing" title="Start free. Upgrade when it pays off." />
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            <Card>
              <CardContent className="space-y-4 p-6">
                <h3 className="text-lg font-semibold">Free</h3>
                <p className="text-3xl font-bold">
                  $0<span className="text-base font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Job search &amp; details</li>
                  <li>Limited job match analyses</li>
                  <li>Limited CV analyses</li>
                  <li>Application tracker</li>
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Pro</h3>
                  <Badge>Most popular</Badge>
                </div>
                <p className="text-3xl font-bold">
                  $9.99<span className="text-base font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Higher AI usage limits</li>
                  <li>CV tailoring &amp; cover letters</li>
                  <li>Interview preparation</li>
                  <li>Skill-gap analysis &amp; job alerts</li>
                </ul>
                <Button className="w-full" asChild>
                  <Link href="/pricing">See full pricing</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          <div className="mt-10 divide-y">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  {f.q}
                  <ArrowRight className="size-4 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Stop guessing. Start applying with intent.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Free to start. Your first match analysis takes about two minutes.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start for free <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
