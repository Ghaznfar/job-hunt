"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { dashboardNav, dashboardSecondaryNav } from "@/lib/dashboard-nav";

function NavList({ items, onNavigate }: { items: typeof dashboardNav; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active =
          item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <NavList items={dashboardNav} onNavigate={onNavigate} />
      </div>
      <div className="border-t pt-4">
        <NavList items={dashboardSecondaryNav} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
