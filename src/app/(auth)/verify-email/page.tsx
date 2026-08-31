import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyEmailAction } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  const result =
    token && email
      ? await verifyEmailAction(email, token)
      : { ok: false as const, error: "Missing verification details." };

  return (
    <div className="bg-card space-y-4 rounded-xl border p-6 text-center shadow-sm">
      {result.ok ? (
        <>
          <CheckCircle2 className="text-success mx-auto size-10" />
          <h1 className="text-xl font-semibold">Email verified</h1>
          <p className="text-muted-foreground text-sm">
            Your account is ready. You can log in now.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Continue to log in</Link>
          </Button>
        </>
      ) : (
        <>
          <XCircle className="text-destructive mx-auto size-10" />
          <h1 className="text-xl font-semibold">Verification failed</h1>
          <p className="text-muted-foreground text-sm">{result.error}</p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to log in</Link>
          </Button>
        </>
      )}
    </div>
  );
}
