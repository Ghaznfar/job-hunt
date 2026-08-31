"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { submitInterviewAnswerAction } from "@/features/interviews/actions";

interface Q {
  id: string;
  question: string;
  userAnswer: string | null;
  aiFeedback: string | null;
  improvedAnswer: string | null;
}

export function QuestionCard({ q, index }: { q: Q; index: number }) {
  const router = useRouter();
  const [answer, setAnswer] = useState(q.userAnswer ?? "");
  const [feedback, setFeedback] = useState(q.aiFeedback);
  const [improved, setImproved] = useState(q.improvedAnswer);
  const [editing, setEditing] = useState(!q.userAnswer);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await submitInterviewAnswerAction({ questionId: q.id, answer });
      if (res.ok) {
        setFeedback(res.data.feedback);
        setImproved(res.data.improvedAnswer);
        setEditing(false);
        toast.success("Feedback ready");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p className="font-medium">
          {index}. {q.question}
        </p>

        {editing ? (
          <>
            <Textarea
              rows={5}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Draft your answer…"
            />
            <Button size="sm" onClick={submit} disabled={pending || answer.trim().length < 10}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Get feedback
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Your answer</p>
              <p className="whitespace-pre-wrap">{answer}</p>
            </div>

            {feedback ? (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase text-primary">Feedback</p>
                <p>{feedback}</p>
              </div>
            ) : null}

            {improved ? (
              <div className="rounded-md border border-success/30 bg-success/5 p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase text-success">Stronger version</p>
                <p className="whitespace-pre-wrap">{improved}</p>
              </div>
            ) : null}

            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <RotateCcw className="size-4" /> Practice again
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
