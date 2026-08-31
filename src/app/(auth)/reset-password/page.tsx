import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Invalid link</h1>
        <p className="text-sm text-muted-foreground">This password reset link is missing its token.</p>
        <Link href="/forgot-password" className="text-sm text-foreground hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
