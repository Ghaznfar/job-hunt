"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteAccountAction, exportMyDataAction } from "@/features/settings/actions";

export function DangerZone() {
  const [confirm, setConfirm] = useState("");
  const [deleting, startDelete] = useTransition();
  const [exporting, startExport] = useTransition();

  function onDelete() {
    startDelete(async () => {
      const res = await deleteAccountAction({ confirm });
      if (!res.ok) toast.error(res.error);
      // On success the action redirects.
    });
  }

  function onExport() {
    startExport(async () => {
      const res = await exportMyDataAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jobhunt-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Export your data</p>
            <p className="text-sm text-muted-foreground">
              Download everything we hold about you as JSON.
            </p>
          </div>
          <Button variant="outline" onClick={onExport} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : null}
            Export
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Delete account</p>
            <p className="text-sm text-muted-foreground">
              Permanently removes your account, CVs, applications and AI results. This cannot be
              undone.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This is permanent. All your data will be erased immediately. Type{" "}
                  <span className="font-mono font-semibold">DELETE</span> to confirm.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={deleting || confirm.trim().toUpperCase() !== "DELETE"}
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Permanently delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
