"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Mode | null) ?? "system";
    setMode(stored);
  }, []);

  function apply(next: Mode) {
    setMode(next);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = next === "dark" || (next === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
  }

  const options: { value: Mode; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className="inline-flex rounded-md border p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => apply(o.value)}
          className={cn(
            "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors",
            mode === o.value
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <o.icon className="size-4" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
