"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { relativeDate } from "@/lib/utils";
import {
  updateCoverLetterAction,
  deleteCoverLetterAction,
} from "@/features/cover-letters/actions";

interface Item {
  id: string;
  content: string;
  tone: string;
  updatedAt: string;
  job: { id: string; title: string; company: string };
}

export function CoverLetterList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {items.map((it) => (
        <Card key={it.id}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">
                {it.job.title} — {it.job.company}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {it.tone} · updated {relativeDate(it.updatedAt)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(it.content);
                  toast.success("Copied");
                }}
              >
                <Copy className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Delete this cover letter?")) {
                    start(async () => {
                      const res = await deleteCoverLetterAction(it.id);
                      if (res.ok) {
                        toast.success("Deleted");
                        router.refresh();
                      } else toast.error(res.error);
                    });
                  }
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {editing === it.id ? (
              <div className="space-y-2">
                <Textarea rows={14} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await updateCoverLetterAction({ id: it.id, content: draft });
                        if (res.ok) {
                          toast.success("Saved");
                          setEditing(null);
                          router.refresh();
                        } else toast.error(res.error);
                      })
                    }
                  >
                    {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-foreground/90">
                  {it.content}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 px-0"
                  onClick={() => {
                    setEditing(it.id);
                    setDraft(it.content);
                  }}
                >
                  Edit
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
