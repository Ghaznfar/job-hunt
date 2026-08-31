import { CheckCircle2, AlertTriangle, XCircle, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

const MAP = {
  APPLY: {
    label: "Apply",
    icon: CheckCircle2,
    cls: "text-success border-success/40 bg-success/10",
  },
  MAYBE: {
    label: "Maybe",
    icon: AlertTriangle,
    cls: "text-[oklch(0.5_0.13_75)] dark:text-warning border-warning/40 bg-warning/10",
  },
  DONT_APPLY: {
    label: "Don't apply",
    icon: XCircle,
    cls: "text-destructive border-destructive/40 bg-destructive/10",
  },
} as const;

export function VerdictBadge({
  verdict,
  score,
  size = "sm",
}: {
  verdict: keyof typeof MAP | null | undefined;
  score?: number | null;
  size?: "sm" | "lg";
}) {
  if (!verdict) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
        <CircleHelp className="size-3.5" /> Not analyzed
      </span>
    );
  }
  const m = MAP[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        m.cls,
        size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs",
      )}
    >
      <m.icon className={size === "lg" ? "size-4" : "size-3.5"} />
      {m.label}
      {typeof score === "number" ? <span className="opacity-70">· {score}%</span> : null}
    </span>
  );
}
