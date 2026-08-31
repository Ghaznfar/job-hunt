import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { Logo } from "@/components/common/logo";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/job-sources", label: "Job sources" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/ai-usage", label: "AI usage" },
  { href: "/admin/errors", label: "Errors" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Logo href="/dashboard" />
          <Badge variant="destructive">Admin</Badge>
        </div>
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
          Back to app
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="hidden w-52 shrink-0 border-r p-3 md:block">
          <nav className="space-y-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-muted-foreground hover:bg-accent hover:text-foreground block rounded-md px-3 py-2 text-sm"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
