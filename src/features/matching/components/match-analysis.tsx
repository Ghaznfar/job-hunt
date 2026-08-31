import Link from "next/link";
import { Check, X, CircleAlert, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VerdictBadge } from "@/features/jobs/components/verdict-badge";
import { AnalyzeButton } from "./analyze-button";

interface SkillScore {
  slug: string;
  name: string;
  importance: "REQUIRED" | "PREFERRED";
  have: boolean;
  score: number;
}

export interface MatchView {
  jobId: string;
  jobTitle: string;
  company: string;
  overallScore: number;
  verdict: "APPLY" | "MAYBE" | "DONT_APPLY";
  recommendation: string;
  reasons: string[];
  concerns: string[];
  scores: {
    technical: number;
    experience: number;
    location: number;
    salary: number;
    seniority: number;
    eligibility: number;
  };
  skillScores: SkillScore[];
  strongMatches: string[];
  missingSkills: string[];
  updatedAt: string;
}

const DIMENSIONS: { key: keyof MatchView["scores"]; label: string }[] = [
  { key: "technical", label: "Technical fit" },
  { key: "experience", label: "Experience fit" },
  { key: "eligibility", label: "Eligibility" },
  { key: "location", label: "Location fit" },
  { key: "seniority", label: "Seniority fit" },
  { key: "salary", label: "Salary fit" },
];

function barColor(score: number) {
  if (score >= 75) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

export function MatchAnalysis({ view }: { view: MatchView }) {
  const required = view.skillScores.filter((s) => s.importance === "REQUIRED");
  const preferred = view.skillScores.filter((s) => s.importance === "PREFERRED");

  return (
    <div className="space-y-6">
      {/* Verdict */}
      <Card
        className={cn(
          "border-2",
          view.verdict === "APPLY" && "border-success/40",
          view.verdict === "MAYBE" && "border-warning/40",
          view.verdict === "DONT_APPLY" && "border-destructive/40",
        )}
      >
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Should I apply?
              </p>
              <div className="mt-2">
                <VerdictBadge verdict={view.verdict} score={view.overallScore} size="lg" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{view.overallScore}%</div>
              <p className="text-xs text-muted-foreground">overall match</p>
            </div>
          </div>

          <p className="mt-4 text-sm">{view.recommendation}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {view.reasons.length ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                  In favour
                </p>
                <ul className="space-y-1.5 text-sm">
                  {view.reasons.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {view.concerns.length ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                  Concerns
                </p>
                <ul className="space-y-1.5 text-sm">
                  {view.concerns.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      {view.verdict === "DONT_APPLY" ? (
                        <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                      ) : (
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                      )}
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Dimension breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DIMENSIONS.map((d) => (
            <div key={d.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{d.label}</span>
                <span className="font-medium">{view.scores[d.key]}%</span>
              </div>
              <Progress
                value={view.scores[d.key]}
                indicatorClassName={barColor(view.scores[d.key])}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Skills */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill match</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...required, ...preferred].map((s) => (
              <div key={s.slug} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {s.have ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <X className="size-4 text-destructive" />
                  )}
                  {s.name}
                  {s.importance === "REQUIRED" ? (
                    <Badge variant="outline" className="text-[10px]">
                      required
                    </Badge>
                  ) : null}
                </span>
                <span className={s.have ? "text-success" : "text-muted-foreground"}>
                  {s.score}%
                </span>
              </div>
            ))}
            {view.skillScores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills to compare.</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-success">Strong matches</CardTitle>
            </CardHeader>
            <CardContent>
              {view.strongMatches.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {view.strongMatches.map((s) => (
                    <Badge key={s} variant="success">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None of the listed skills matched.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-destructive">Missing skills</CardTitle>
            </CardHeader>
            <CardContent>
              {view.missingSkills.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {view.missingSkills.map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">You have every listed skill.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-muted-foreground">
            Ready to apply? Tailor your CV and generate a cover letter for this role.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/cover-letters?job=${view.jobId}`}>Cover letter</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/dashboard/resumes/tailor/${view.jobId}`}>
                Tailor CV <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Last analyzed {new Date(view.updatedAt).toLocaleString()}</span>
        <AnalyzeButton jobId={view.jobId} label="Re-run analysis" size="sm" />
      </div>
    </div>
  );
}
