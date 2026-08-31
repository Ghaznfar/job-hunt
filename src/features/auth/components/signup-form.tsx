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
      <div className="bg-card space-y-4 rounded-xl border p-6 text-center shadow-sm">
        <CheckCircle2 className="text-success mx-auto size-10" />
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-muted-foreground text-sm">
          We sent a verification link to <span className="text-foreground font-medium">{done}</span>
          . Click it to activate your account.
        </p>
        <p className="text-muted-foreground text-xs">
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
        <Link href="/login" className="text-muted-foreground hover:text-foreground block text-sm">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-card space-y-4 rounded-xl border p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-muted-foreground text-sm">Free to start. No credit card.</p>
      </div>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" autoComplete="name" required />
        {errors.name ? <p className="text-destructive text-xs">{errors.name[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {errors.email ? <p className="text-destructive text-xs">{errors.email[0]}</p> : null}
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
          <div className="bg-muted h-1 flex-1 rounded">
            <div
              className="bg-primary h-1 rounded transition-all"
              style={{ width: `${(strength.score / 4) * 100}%` }}
            />
          </div>
          <span className="text-muted-foreground w-16 text-right text-xs">{strength.label}</span>
        </div>
        {errors.password ? <p className="text-destructive text-xs">{errors.password[0]}</p> : null}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Create account
      </Button>

      {googleEnabled ? (
        <>
          <div className="text-muted-foreground relative py-1 text-center text-xs">
            <span className="bg-card relative z-10 px-2">or</span>
            <span className="absolute inset-x-0 top-1/2 border-t" />
          </div>
          <GoogleButton next={next} />
        </>
      ) : null}

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground font-medium hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
