"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateInterviewQuestionsAction } from "@/features/interviews/actions";

export function GenerateQuestionsButton({
  jobId,
  label = "Generate questions",
}: {
  jobId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await generateInterviewQuestionsAction(jobId);
          if (res.ok) {
            toast.success(`${res.data.count} questions ready`);
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {pending ? "Generating…" : label}
    </Button>
  );
}
