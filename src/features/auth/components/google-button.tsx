"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function GoogleButton({ next }: { next?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => signIn("google", { callbackUrl: next && next.startsWith("/") ? next : "/dashboard" })}
    >
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M12.24 10.4v3.36h4.77c-.2 1.23-1.43 3.6-4.77 3.6-2.87 0-5.2-2.38-5.2-5.31s2.33-5.31 5.2-5.31c1.63 0 2.72.7 3.35 1.29l2.28-2.2C16.4 3.77 14.53 3 12.24 3 7.7 3 4 6.7 4 11.24s3.7 8.24 8.24 8.24c4.76 0 7.9-3.35 7.9-8.06 0-.54-.06-.96-.13-1.38z"
        />
      </svg>
      Continue with Google
    </Button>
  );
}
