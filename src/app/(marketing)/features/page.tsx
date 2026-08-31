import type { Metadata } from "next";
import {
  Target,
  ShieldCheck,
  FileText,
  Sparkles,
  MessagesSquare,
  KanbanSquare,
  TrendingUp,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Job matching, a Should I Apply verdict, eligibility checks, CV tailoring, cover letters, interview prep, skill-gap analysis and an application tracker — built for engineers.",
  alternates: { canonical: "/features" },
};

const groups = [
  {
    icon: Search,
    title: "Job discovery",
    points: [
      "Filter by country, remote, title, skills, salary, experience and date",
      "Modular provider architecture — legitimate APIs only, no ToS-violating scraping",
      "Normalized, de-duplicated job records",
    ],
  },
  {
    icon: Target,
    title: "Match analysis",
    points: [
      "Six scored dimensions: technical, experience, location, salary, seniority, eligibility",
      "Per-skill breakdown with strong matches and gaps",
      "Deterministic scoring with an AI explanation layer",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Should I Apply engine",
    points: [
      "Apply / Maybe / Don't Apply with explicit reasons and concerns",
      "Hard eligibility rules: work authorization, visa sponsorship, onsite/remote",
      "AI phrases the result but cannot change the verdict",
    ],
  },
  {
    icon: FileText,
    title: "CV management & tailoring",
    points: [
      "PDF/DOCX parsing into structured, editable data",
      "Multiple named CV versions",
      "Tailoring shown as a diff you approve — no fabrication",
    ],
  },
  {
    icon: Sparkles,
    title: "Cover letters",
    points: ["Grounded in your CV and the job", "Regenerate, edit, copy, save", "Tone control"],
  },
  {
    icon: MessagesSquare,
    title: "Interview preparation",
    points: [
      "Technical, scenario, behavioral, HR and job-specific questions",
      "Answer, get feedback, see a stronger version, retry",
    ],
  },
  {
    icon: KanbanSquare,
    title: "Application tracker",
    points: [
      "Kanban from Saved to Offer",
      "Notes, contacts, interview dates",
      "Response-rate and pipeline stats",
    ],
  },
  {
    icon: TrendingUp,
    title: "Skill-gap analysis",
    points: [
      "The skills most requested across your target roles",
      "What to learn next to unlock better matches",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Features</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl">
        Everything is oriented around making each application count.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.title}>
            <CardContent className="space-y-3 p-6">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <g.icon className="size-5" />
              </div>
              <h2 className="font-semibold">{g.title}</h2>
              <ul className="text-muted-foreground space-y-1.5 text-sm">
                {g.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="bg-muted-foreground mt-2 size-1 shrink-0 rounded-full" />
                    {p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
