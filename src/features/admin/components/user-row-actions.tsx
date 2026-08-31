"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Shield, ShieldOff, Ban, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setUserRoleAction, setUserDisabledAction } from "@/features/admin/actions";

export function UserRowActions({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: "USER" | "ADMIN";
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div className="flex justify-end gap-1">
      {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => run(() => setUserRoleAction(userId, role === "ADMIN" ? "USER" : "ADMIN"))}
        title={role === "ADMIN" ? "Demote to user" : "Promote to admin"}
      >
        {role === "ADMIN" ? <ShieldOff className="size-4" /> : <Shield className="size-4" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={disabled ? "text-success" : "text-destructive"}
        onClick={() => run(() => setUserDisabledAction(userId, !disabled))}
        title={disabled ? "Re-enable" : "Disable"}
      >
        {disabled ? <CircleCheck className="size-4" /> : <Ban className="size-4" />}
      </Button>
    </div>
  );
}
