import Link from "next/link";
import { Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
        <Crosshair className="size-4" />
      </span>
      <span className="text-base">{brand.name}</span>
    </Link>
  );
}
