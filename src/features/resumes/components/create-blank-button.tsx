"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilePlus2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBlankResumeAction } from "@/features/resumes/actions";

export function CreateBlankButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function create() {
    start(async () => {
      const res = await createBlankResumeAction({ name });
      if (res.ok) {
        toast.success("CV created");
        setOpen(false);
        router.push(`/dashboard/resumes/${res.data.resumeId}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FilePlus2 className="size-4" /> Create manually
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a CV manually</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="blank-name">CV name</Label>
          <Input
            id="blank-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cloud Engineer CV"
          />
        </div>
        <DialogFooter>
          <Button onClick={create} disabled={pending || !name.trim()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
