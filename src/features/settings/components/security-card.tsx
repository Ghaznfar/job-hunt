"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/features/settings/actions";

export function SecurityCard({ hasPassword }: { hasPassword: boolean }) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    start(async () => {
      const res = await changePasswordAction(fd);
      if (res.ok) {
        toast.success("Password updated");
        form.reset();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasPassword ? "Change password" : "Set a password"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="max-w-sm space-y-4">
          {hasPassword ? (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
              />
              {errors.currentPassword ? (
                <p className="text-destructive text-xs">{errors.currentPassword[0]}</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            {errors.newPassword ? (
              <p className="text-destructive text-xs">{errors.newPassword[0]}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
            />
            {errors.confirm ? (
              <p className="text-destructive text-xs">{errors.confirm[0]}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
