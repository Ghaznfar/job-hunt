"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { passwordStrength } from "@/lib/auth/password-policy";
import { signUpAction, resendVerificationAction } from "@/features/auth/actions";
import { GoogleButton } from "@/features/auth/components/google-button";

export function SignupForm({ next, googleEnabled }: { next?: string; googleEnabled: boolean }) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const strength = passwordStrength(pw);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await signUpAction(fd);
      if (res.ok) setDone(res.data.email);
      else {
        setFormError(res.error);
        setErrors(res.fieldErrors ?? {});
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to <span className="font-medium text-foreground">{done}</span>.
          Click it to activate your account.
        </p>
        <p className="text-xs text-muted-foreground">
          In development the link is printed to the server console.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => resendVerificationAction(done)}
          disabled={pending}
        >
          Resend link
        </Button>
        <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Free to start. No credit card.</p>
      </div>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" autoComplete="name" required />
        {errors.name ? <p className="text-xs text-destructive">{errors.name[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {errors.email ? <p className="text-xs text-destructive">{errors.email[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 rounded bg-muted">
            <div
              className="h-1 rounded bg-primary transition-all"
              style={{ width: `${(strength.score / 4) * 100}%` }}
            />
          </div>
          <span className="w-16 text-right text-xs text-muted-foreground">{strength.label}</span>
        </div>
        {errors.password ? <p className="text-xs text-destructive">{errors.password[0]}</p> : null}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Create account
      </Button>

      {googleEnabled ? (
        <>
          <div className="relative py-1 text-center text-xs text-muted-foreground">
            <span className="relative z-10 bg-card px-2">or</span>
            <span className="absolute inset-x-0 top-1/2 border-t" />
          </div>
          <GoogleButton next={next} />
        </>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
