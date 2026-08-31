import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isGoogleAuthConfigured } from "@/lib/env";
import { LoginForm } from "@/features/auth/components/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { next, error } = await searchParams;

  return (
    <div className="space-y-4">
      {error === "account_disabled" ? (
        <Alert variant="destructive">
          <AlertDescription>This account has been disabled. Contact support.</AlertDescription>
        </Alert>
      ) : null}
      <LoginForm next={next} googleEnabled={isGoogleAuthConfigured} />
    </div>
  );
}
