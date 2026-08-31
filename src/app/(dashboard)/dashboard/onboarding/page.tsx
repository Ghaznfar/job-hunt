import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { OnboardingWizard } from "@/features/profile/components/onboarding-wizard";
import type { ProfileFormState } from "@/features/profile/components/profile-fields";

export const metadata: Metadata = { title: "Get started", robots: { index: false } };

export default async function OnboardingPage() {
  const user = await requireUser();
  const [profile, skills] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.skill.findMany({
      where: { NOT: { category: "custom" } },
      select: { slug: true, name: true, category: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (profile?.onboardingCompletedAt) redirect("/dashboard");

  const wa = (profile?.workAuthorizations ?? {}) as Record<string, string>;
  const initial: Partial<ProfileFormState> = {
    name: user.name ?? "",
    country: profile?.country ?? "",
    city: profile?.city ?? "",
    linkedinUrl: profile?.linkedinUrl ?? "",
    githubUrl: profile?.githubUrl ?? "",
    portfolioUrl: profile?.portfolioUrl ?? "",
    currentTitle: profile?.currentTitle ?? "",
    yearsExperience: profile?.yearsExperience != null ? String(profile.yearsExperience) : "",
    desiredTitles: profile?.desiredTitles ?? [],
    targetCountries: profile?.targetCountries?.length ? profile.targetCountries : ["US", "GB"],
    workPreference: profile?.workPreference ?? "REMOTE",
    salaryExpectation: profile?.salaryExpectation != null ? String(profile.salaryExpectation) : "",
    salaryCurrency: profile?.salaryCurrency ?? "USD",
    needsSponsorship: profile?.needsSponsorship ?? false,
    workAuthUS: wa.US ?? "",
    workAuthGB: wa.GB ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Let&apos;s set up your profile</h1>
        <p className="text-muted-foreground">
          A few details so JobHunt can score jobs against your real background.
        </p>
      </div>
      <OnboardingWizard initial={initial} skillOptions={skills} />
    </div>
  );
}
