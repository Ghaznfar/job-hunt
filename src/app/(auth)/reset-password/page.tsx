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
      <div className="bg-card space-y-3 rounded-xl border p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Invalid link</h1>
        <p className="text-muted-foreground text-sm">
          This password reset link is missing its token.
        </p>
        <Link href="/forgot-password" className="text-foreground text-sm hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
