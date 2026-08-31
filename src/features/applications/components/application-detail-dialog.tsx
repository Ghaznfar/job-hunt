"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { relativeDate } from "@/lib/utils";
import { STATUS_ORDER, STATUS_LABEL } from "@/features/applications/constants";
import {
  getApplicationDetailAction,
  updateApplicationAction,
  moveApplicationAction,
  addApplicationNoteAction,
  deleteApplicationAction,
  type ApplicationDetail,
} from "@/features/applications/actions";

export function ApplicationDetailDialog({
  applicationId,
  open,
  onOpenChange,
}: {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<ApplicationDetail | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setData(null);
    getApplicationDetailAction(applicationId).then((res) => {
      if (res.ok) setData(res.data);
      else toast.error(res.error);
    });
  }, [open, applicationId]);

  function saveField(field: Partial<ApplicationDetail>) {
    if (!data) return;
    const merged = { ...data, ...field };
    setData(merged);
    start(async () => {
      const res = await updateApplicationAction({
        id: data.id,
        company: merged.company,
        title: merged.title,
        jobUrl: merged.jobUrl ?? "",
        salary: merged.salary ?? "",
        contactName: merged.contactName ?? "",
        contactEmail: merged.contactEmail ?? "",
        nextInterviewAt: merged.nextInterviewAt
          ? new Date(merged.nextInterviewAt).toISOString().slice(0, 16)
          : "",
      });
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {!data ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">
                {data.title} — {data.company}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Company</Label>
                  <Input
                    defaultValue={data.company}
                    onBlur={(e) =>
                      e.target.value !== data.company && saveField({ company: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Job title</Label>
                  <Input
                    defaultValue={data.title}
                    onBlur={(e) =>
                      e.target.value !== data.title && saveField({ title: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={data.status}
                    onValueChange={(v) => {
                      setData({ ...data, status: v as ApplicationDetail["status"] });
                      start(async () => {
                        const res = await moveApplicationAction({ id: data.id, status: v });
                        if (!res.ok) toast.error(res.error);
                        else router.refresh();
                      });
                    }}
                  >
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
                  <Label className="text-xs">Salary</Label>
                  <Input
                    defaultValue={data.salary ?? ""}
                    onBlur={(e) => saveField({ salary: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Job URL</Label>
                <div className="flex gap-2">
                  <Input
                    defaultValue={data.jobUrl ?? ""}
                    onBlur={(e) => saveField({ jobUrl: e.target.value })}
                  />
                  {data.jobUrl ? (
                    <Button variant="outline" size="icon" asChild>
                      <a href={data.jobUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contact name</Label>
                  <Input
                    defaultValue={data.contactName ?? ""}
                    onBlur={(e) => saveField({ contactName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact email</Label>
                  <Input
                    defaultValue={data.contactEmail ?? ""}
                    onBlur={(e) => saveField({ contactEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Next interview</Label>
                <Input
                  type="datetime-local"
                  defaultValue={
                    data.nextInterviewAt
                      ? new Date(data.nextInterviewAt).toISOString().slice(0, 16)
                      : ""
                  }
                  onBlur={(e) => saveField({ nextInterviewAt: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-xs">Notes</Label>
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note…"
                  />
                  <Button
                    size="sm"
                    disabled={pending || !note.trim()}
                    onClick={() =>
                      start(async () => {
                        const res = await addApplicationNoteAction({
                          applicationId: data.id,
                          body: note,
                        });
                        if (res.ok) {
                          setNote("");
                          const refreshed = await getApplicationDetailAction(data.id);
                          if (refreshed.ok) setData(refreshed.data);
                          router.refresh();
                        } else toast.error(res.error);
                      })
                    }
                  >
                    Add
                  </Button>
                </div>
                <ul className="space-y-1.5">
                  {data.notes.map((n) => (
                    <li key={n.id} className="bg-muted/30 rounded-md border p-2 text-sm">
                      <p className="whitespace-pre-wrap">{n.body}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {relativeDate(n.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* History */}
              {data.events.length > 0 ? (
                <div className="space-y-1">
                  <Label className="text-xs">History</Label>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    {data.events.map((e, i) => (
                      <li key={i}>
                        {e.fromStatus ? `${STATUS_LABEL[e.fromStatus]} → ` : "Created as "}
                        {STATUS_LABEL[e.toStatus]} · {relativeDate(e.createdAt)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex justify-between border-t pt-3">
                {pending ? (
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Loader2 className="size-3 animate-spin" /> Saving…
                  </span>
                ) : (
                  <span />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("Delete this application?")) {
                      start(async () => {
                        const res = await deleteApplicationAction(data.id);
                        if (res.ok) {
                          onOpenChange(false);
                          router.refresh();
                        } else toast.error(res.error);
                      });
                    }
                  }}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
