import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/common/logo";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Badge } from "@/components/ui/badge";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { plan: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/90 sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <MobileNav />
          <Logo href="/dashboard" />
          <Badge variant={subscription?.plan === "PRO" ? "default" : "secondary"} className="ml-1">
            {subscription?.plan === "PRO" ? "Pro" : "Free"}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          {subscription?.plan !== "PRO" ? (
            <Link
              href="/dashboard/settings/billing"
              className="text-primary hidden text-sm font-medium hover:underline sm:block"
            >
              Upgrade to Pro
            </Link>
          ) : null}
          <UserMenu
            name={user.name}
            email={user.email}
            image={user.image}
            isAdmin={user.role === "ADMIN"}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="hidden w-60 shrink-0 border-r p-4 md:block">
          <SidebarNav />
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
