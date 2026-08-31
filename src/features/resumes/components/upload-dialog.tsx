"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadResumeAction } from "@/features/resumes/actions";

export function UploadDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await uploadResumeAction(fd);
      if (res.ok) {
        toast.success("CV uploaded and parsed");
        setOpen(false);
        router.push(`/dashboard/resumes/${res.data.resumeId}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Upload className="size-4" /> Upload CV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload your CV</DialogTitle>
          <DialogDescription>
            PDF or DOCX, up to 8MB. We&apos;ll extract your experience, skills and education — all
            editable afterwards. Files are stored privately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">CV name</Label>
            <Input id="name" name="name" placeholder="e.g. DevOps CV" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              ref={fileRef}
              id="file"
              name="file"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Upload &amp; parse
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
