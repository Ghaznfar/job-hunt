"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side error boundary. Server errors are logged server-side.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        An unexpected error occurred. Try again, and if it keeps happening, contact support.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground mt-1 text-xs">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
