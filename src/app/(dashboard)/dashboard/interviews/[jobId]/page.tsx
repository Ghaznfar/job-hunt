import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getInterviewQuestions } from "@/services/interview.service";
import { getUsageStatus } from "@/services/usage.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { GenerateQuestionsButton } from "@/features/interviews/components/generate-questions-button";
import { QuestionCard } from "@/features/interviews/components/question-card";

export const metadata: Metadata = { title: "Interview Preparation", robots: { index: false } };

const CATEGORY_LABEL: Record<string, string> = {
  TECHNICAL: "Technical",
  SCENARIO: "Scenario",
  BEHAVIORAL: "Behavioral",
  HR: "HR",
  JOB_SPECIFIC: "Job-specific",
};
const ORDER = ["TECHNICAL", "SCENARIO", "BEHAVIORAL", "HR", "JOB_SPECIFIC"];

export default async function InterviewJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await requireUser();

  const [job, questions, usage] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, company: true },
    }),
    getInterviewQuestions(user.id, jobId),
    getUsageStatus(user.id, "INTERVIEW_PREP"),
  ]);
  if (!job) notFound();

  const grouped = ORDER.map((cat) => ({
    cat,
    items: questions.filter((q) => q.category === cat),
  })).filter((g) => g.items.length > 0);

  let counter = 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/dashboard/interviews"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> All prep sets
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
          <p className="text-muted-foreground">{job.company}</p>
        </div>
        {questions.length > 0 && !usage.locked ? (
          <GenerateQuestionsButton jobId={jobId} label="Regenerate set" />
        ) : null}
      </div>

      {usage.locked ? (
        <EmptyState
          title="Interview prep is a Pro feature"
          action={
            <Button asChild>
              <Link href="/dashboard/settings/billing">Upgrade to Pro</Link>
            </Button>
          }
        />
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <p className="text-muted-foreground max-w-sm text-sm">
              Generate a tailored question set for this role. You&apos;ll get technical, scenario,
              behavioral, HR and job-specific questions to practise.
            </p>
            <GenerateQuestionsButton jobId={jobId} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map((g) => (
            <section key={g.cat} className="space-y-3">
              <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                {CATEGORY_LABEL[g.cat]}
              </h2>
              {g.items.map((q) => {
                counter += 1;
                return (
                  <QuestionCard
                    key={q.id}
                    index={counter}
                    q={{
                      id: q.id,
                      question: q.question,
                      userAnswer: q.userAnswer,
                      aiFeedback: q.aiFeedback,
                      improvedAnswer: q.improvedAnswer,
                    }}
                  />
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
