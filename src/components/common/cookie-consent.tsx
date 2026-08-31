"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const KEY = "cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* storage blocked — don't nag */
    }
  }, []);

  if (!visible) return null;

  function dismiss(value: "accepted" | "declined") {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use strictly necessary cookies for sign-in and security only. See our{" "}
          <Link href="/legal/cookies" className="underline hover:text-foreground">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => dismiss("declined")}>
            Dismiss
          </Button>
          <Button size="sm" onClick={() => dismiss("accepted")}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
