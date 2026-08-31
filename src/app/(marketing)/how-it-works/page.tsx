import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How JobHunt scores tech jobs against your real profile and gives an Apply / Maybe / Don't Apply verdict, then helps you tailor your CV and prep for interviews.",
  alternates: { canonical: "/how-it-works" },
};

const stages = [
  {
    n: 1,
    t: "Build your profile",
    d: "Country, target roles, salary, remote preference and — importantly — your work authorization and sponsorship needs.",
  },
  {
    n: 2,
    t: "Upload your CV",
    d: "PDF or DOCX. We extract structured experience, skills, education and projects. Everything is editable and stored privately.",
  },
  {
    n: 3,
    t: "Search real jobs",
    d: "Filter by country, remote, title, skills, salary, experience and date posted. Jobs come from legitimate APIs via a modular provider layer.",
  },
  {
    n: 4,
    t: "See the match breakdown",
    d: "Technical, experience, location, salary, seniority and eligibility — each scored separately, combined into one number.",
  },
  {
    n: 5,
    t: "Get the verdict",
    d: "A deterministic engine returns Apply, Maybe or Don't Apply with concrete reasons and concerns. AI explains it; it never overrides the rules.",
  },
  {
    n: 6,
    t: "Apply with quality",
    d: "Tailor your CV (as a reviewable diff), generate a cover letter, and prep interview answers with feedback — then track it on your board.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">How it works</h1>
      <p className="text-muted-foreground mt-4">
        JobHunt is built around one question: <em>is this job actually worth your time?</em>
      </p>

      <ol className="mt-12 space-y-8">
        {stages.map((s) => (
          <li key={s.n} className="flex gap-4">
            <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full font-semibold">
              {s.n}
            </span>
            <div>
              <h2 className="font-semibold">{s.t}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="bg-muted/30 mt-12 rounded-xl border p-6">
        <h3 className="font-semibold">On accuracy and honesty</h3>
        <p className="text-muted-foreground mt-2 text-sm">
          The scoring engine is deterministic and testable. AI is used only to interpret and phrase
          results using facts already in your profile and CV. It will never invent employment,
          skills, certifications or achievements.
        </p>
      </div>

      <div className="mt-10">
        <Button asChild size="lg">
          <Link href="/signup">Start for free</Link>
        </Button>
      </div>
    </div>
  );
}
