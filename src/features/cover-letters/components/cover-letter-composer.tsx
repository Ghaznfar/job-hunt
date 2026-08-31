"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateCoverLetterAction,
  updateCoverLetterAction,
} from "@/features/cover-letters/actions";

const TONES = [
  ["professional", "Professional"],
  ["enthusiastic", "Enthusiastic"],
  ["concise", "Concise"],
  ["warm", "Warm"],
] as const;

export function CoverLetterComposer({
  jobs,
  initialJobId,
}: {
  jobs: { id: string; title: string; company: string }[];
  initialJobId?: string;
}) {
  const router = useRouter();
  const [jobId, setJobId] = useState(initialJobId ?? jobs[0]?.id ?? "");
  const [tone, setTone] = useState<(typeof TONES)[number][0]>("professional");
  const [letterId, setLetterId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [genPending, startGen] = useTransition();
  const [savePending, startSave] = useTransition();

  function generate() {
    if (!jobId) {
      toast.error("Choose a job first.");
      return;
    }
    startGen(async () => {
      const res = await generateCoverLetterAction({ jobId, tone });
      if (res.ok) {
        setLetterId(res.data.id);
        setContent(res.data.content);
        toast.success("Draft ready");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function save() {
    if (!letterId) return;
    startSave(async () => {
      const res = await updateCoverLetterAction({ id: letterId, content });
      if (res.ok) toast.success("Saved");
      else toast.error(res.error);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Job</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title} — {j.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Save or analyze a job first, then come back to generate a cover letter for it.
          </p>
        ) : null}

        {!content ? (
          <Button onClick={generate} disabled={genPending || !jobId}>
            {genPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {genPending ? "Writing…" : "Generate cover letter"}
          </Button>
        ) : (
          <>
            <Textarea
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-serif leading-relaxed"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={savePending}>
                {savePending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
              </Button>
              <Button variant="outline" onClick={generate} disabled={genPending}>
                {genPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Regenerate
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(content);
                  toast.success("Copied to clipboard");
                }}
              >
                <Copy className="size-4" /> Copy
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
