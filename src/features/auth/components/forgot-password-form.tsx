"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "@/features/auth/actions";

export function ForgotPasswordForm() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await requestPasswordResetAction(fd);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <MailCheck className="mx-auto size-10 text-success" />
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If an account exists for that address, we&apos;ve sent a password reset link. It expires in
          one hour.
        </p>
        <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Send reset link
      </Button>
      <Link
        href="/login"
        className="block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Back to log in
      </Link>
    </form>
  );
}
