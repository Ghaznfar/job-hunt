"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_ORDER, STATUS_LABEL } from "@/features/applications/constants";
import { createApplicationAction } from "@/features/applications/actions";

export function AddApplicationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("SAVED");
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    fd.set("status", status);
    start(async () => {
      const res = await createApplicationAction(Object.fromEntries(fd));
      if (res.ok) {
        toast.success("Application added");
        setOpen(false);
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Add application
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an application</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" required />
              {errors.company ? (
                <p className="text-destructive text-xs">{errors.company[0]}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" name="title" required />
              {errors.title ? <p className="text-destructive text-xs">{errors.title[0]}</p> : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="salary">Salary (optional)</Label>
              <Input id="salary" name="salary" placeholder="e.g. £70k" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="jobUrl">Job URL (optional)</Label>
            <Input id="jobUrl" name="jobUrl" type="url" placeholder="https://…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
