"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, MoreVertical, Star, Trash2, Pencil, Download, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { relativeDate } from "@/lib/utils";
import {
  setDefaultResumeAction,
  deleteResumeAction,
  renameResumeAction,
  getResumeDownloadUrlAction,
} from "@/features/resumes/actions";

interface ResumeRow {
  id: string;
  name: string;
  isDefault: boolean;
  fileType: string | null;
  hasFile: boolean;
  updatedAt: string;
  versionCount: number;
}

export function ResumeList({ resumes }: { resumes: ResumeRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [renaming, setRenaming] = useState<ResumeRow | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(successMsg);
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    });
  }

  async function download(id: string) {
    const res = await getResumeDownloadUrlAction(id);
    if (res.ok) window.open(res.data.url, "_blank");
    else toast.error(res.error);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resumes.map((r) => (
          <Card key={r.id} className="group relative">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                  <FileText className="size-5" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="hover:bg-accent rounded p-1">
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!r.isDefault ? (
                      <DropdownMenuItem
                        onClick={() => act(() => setDefaultResumeAction(r.id), "Set as default")}
                      >
                        <Star /> Make default
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      onClick={() => {
                        setRenaming(r);
                        setRenameValue(r.name);
                      }}
                    >
                      <Pencil /> Rename
                    </DropdownMenuItem>
                    {r.hasFile ? (
                      <DropdownMenuItem onClick={() => download(r.id)}>
                        <Download /> Download original
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${r.name}"? This cannot be undone.`)) {
                          act(() => deleteResumeAction(r.id), "CV deleted");
                        }
                      }}
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Link href={`/dashboard/resumes/${r.id}`} className="mt-4 block">
                <p className="font-medium">{r.name}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {r.fileType ?? "Manual"} · {r.versionCount} version
                  {r.versionCount === 1 ? "" : "s"} · updated {relativeDate(r.updatedAt)}
                </p>
              </Link>

              <div className="mt-3 flex gap-2">
                {r.isDefault ? (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="size-3" /> Default
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename CV</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button
              onClick={() => {
                const id = renaming!.id;
                act(() => renameResumeAction({ resumeId: id, name: renameValue }), "Renamed");
                setRenaming(null);
              }}
              disabled={pending || !renameValue.trim()}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
