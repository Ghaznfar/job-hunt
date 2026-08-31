"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resetPasswordAction } from "@/features/auth/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("token", token);
    start(async () => {
      const res = await resetPasswordAction(fd);
      if (res.ok) {
        toast.success("Password updated. Please log in.");
        router.push("/login");
      } else {
        setFormError(res.error);
        setErrors(res.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
      </div>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        {errors.password ? <p className="text-xs text-destructive">{errors.password[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        {errors.confirm ? <p className="text-xs text-destructive">{errors.confirm[0]}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}
