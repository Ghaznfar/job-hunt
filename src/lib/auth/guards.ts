import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "USER" | "ADMIN";
};

/** Returns the current session user, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role ?? "USER",
  };
});

/** Require an authenticated user or redirect to /login. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { disabledAt: true },
  });
  if (db?.disabledAt) redirect("/login?error=account_disabled");
  return user;
}

/** Require an authenticated user who has completed onboarding. */
export async function requireOnboardedUser(): Promise<SessionUser> {
  const user = await requireUser();
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { onboardingCompletedAt: true },
  });
  if (!profile?.onboardingCompletedAt) redirect("/dashboard/onboarding");
  return user;
}

/** Require an admin user, or redirect away (do not reveal the route exists). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
