"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeMatchAction } from "@/features/matching/actions";

export function AnalyzeButton({
  jobId,
  label = "Analyze this job",
  size = "default",
}: {
  jobId: string;
  label?: string;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      size={size}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await analyzeMatchAction(jobId);
          if (res.ok) {
            toast.success("Analysis ready");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {pending ? "Analyzing…" : label}
    </Button>
  );
}
