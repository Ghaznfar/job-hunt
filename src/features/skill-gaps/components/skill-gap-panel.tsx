"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { generateSkillGapAction } from "@/features/skill-gaps/actions";
import type { SkillGapView } from "@/services/skill-gap.service";

export function SkillGapPanel({ initial }: { initial: SkillGapView | null }) {
  const [report, setReport] = useState<SkillGapView | null>(initial);
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const res = await generateSkillGapAction();
      if (res.ok) {
        setReport(res.data);
        toast.success("Analysis updated");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {report
            ? `Target roles: ${report.targetTitles.join(", ") || "none set"}`
            : "See which skills matter most for your target roles."}
        </p>
        <Button onClick={run} disabled={pending} size="sm">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {report ? "Refresh" : "Run analysis"}
        </Button>
      </div>

      {report ? (
        <>
          <Card>
            <CardContent className="p-5 text-sm">{report.summary}</CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-5">
              {report.topSkills.map((s) => (
                <div key={s.skill}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {s.skill}
                      {s.haveIt ? (
                        <Badge variant="success" className="text-[10px]">
                          you have this
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          gap
                        </Badge>
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs">{s.demand}% demand</span>
                  </div>
                  <Progress
                    value={s.demand}
                    indicatorClassName={s.haveIt ? "bg-success" : "bg-primary"}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
