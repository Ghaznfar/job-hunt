import Link from "next/link";
import { Logo } from "@/components/common/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {children}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
