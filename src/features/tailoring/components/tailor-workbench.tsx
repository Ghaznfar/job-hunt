"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  generateTailoringAction,
  applyTailoringAction,
} from "@/features/tailoring/actions";
import type { TailoringPreview } from "@/services/tailoring.service";

export function TailorWorkbench({
  jobId,
  jobTitle,
  resumeName,
}: {
  jobId: string;
  jobTitle: string;
  resumeName: string;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<TailoringPreview | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [genPending, startGen] = useTransition();
  const [applyPending, startApply] = useTransition();

  function generate() {
    startGen(async () => {
      const res = await generateTailoringAction(jobId);
      if (res.ok) {
        setPreview(res.data);
        setAccepted(new Set(res.data.changes.filter((c) => !c.flagged).map((c) => c.id)));
      } else {
        toast.error(res.error);
      }
    });
  }

  function apply() {
    if (!preview) return;
    const chosen = preview.changes.filter((c) => accepted.has(c.id));
    if (chosen.length === 0) {
      toast.error("Select at least one change to apply.");
      return;
    }
    startApply(async () => {
      const res = await applyTailoringAction({
        jobId,
        resumeId: preview.resumeId,
        accepted: chosen.map((c) => ({ original: c.original, improved: c.improved })),
      });
      if (res.ok) {
        toast.success("Tailored CV version created");
        router.push(`/dashboard/resumes/${res.data.resumeId}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!preview) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <div>
            <p className="font-medium">Tailor &ldquo;{resumeName}&rdquo; for {jobTitle}</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              We&apos;ll suggest wording and emphasis changes as a reviewable diff. Nothing is
              changed until you approve it, and it will never add experience or skills you don&apos;t
              have.
            </p>
          </div>
          <Button onClick={generate} disabled={genPending}>
            {genPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {genPending ? "Analyzing your CV…" : "Generate suggestions"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p>{preview.overallNote}</p>
        {preview.skillsToHighlight.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Emphasise:</span>
            {preview.skillsToHighlight.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {preview.changes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No wording changes suggested — your CV already reads well for this role.
          </CardContent>
        </Card>
      ) : (
        preview.changes.map((c) => (
          <Card key={c.id} className={cn(c.flagged && "border-warning/50")}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={accepted.has(c.id)}
                    onCheckedChange={(v) =>
                      setAccepted((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(c.id);
                        else next.delete(c.id);
                        return next;
                      })
                    }
                  />
                  <span className="text-sm font-medium">{c.location || c.section}</span>
                </div>
                {c.flagged ? (
                  <Badge variant="warning" className="gap-1">
                    <TriangleAlert className="size-3" /> Review
                  </Badge>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Original</p>
                  {c.original}
                </div>
                <div className="rounded-md border border-success/30 bg-success/5 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Improved</p>
                  {c.improved}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Why:</span> {c.reason}
              </p>
              {c.flagged ? (
                <p className="text-xs text-warning">
                  <span className="font-medium">Flagged:</span> {c.flagReason} Unchecked by default —
                  only keep it if it&apos;s accurate.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="ghost" asChild>
          <Link href={`/dashboard/jobs/${jobId}`}>Cancel</Link>
        </Button>
        <Button onClick={apply} disabled={applyPending || accepted.size === 0}>
          {applyPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Apply {accepted.size} change{accepted.size === 1 ? "" : "s"} as new version
        </Button>
      </div>
    </div>
  );
}
