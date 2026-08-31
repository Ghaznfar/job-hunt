"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveJobAction, unsaveJobAction } from "@/features/jobs/actions";

export function SaveButton({
  jobId,
  initialSaved,
  size = "sm",
  variant = "outline",
}: {
  jobId: string;
  initialSaved: boolean;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "secondary";
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next);
    start(async () => {
      const res = next ? await saveJobAction(jobId) : await unsaveJobAction(jobId);
      if (!res.ok) {
        setSaved(!next);
        toast.error(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Button variant={saved ? "secondary" : variant} size={size} onClick={toggle} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="size-4" />
      ) : (
        <Bookmark className="size-4" />
      )}
      {size !== "icon" ? (saved ? "Saved" : "Save") : null}
    </Button>
  );
}
