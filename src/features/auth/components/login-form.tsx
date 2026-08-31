"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginAction } from "@/features/auth/login-action";
import { GoogleButton } from "@/features/auth/components/google-button";

export function LoginForm({ next, googleEnabled }: { next?: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (next) fd.set("next", next);
    start(async () => {
      const res = await loginAction(fd);
      if (res.ok) {
        toast.success("Welcome back");
        router.push(res.data.redirectTo);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="bg-card space-y-4 rounded-xl border p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Log in</h1>
        <p className="text-muted-foreground text-sm">Welcome back. Enter your details.</p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Log in
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
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-foreground font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
