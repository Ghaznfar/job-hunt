import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { ProfileEditor } from "@/features/profile/components/profile-editor";
import type { ProfileFormState } from "@/features/profile/components/profile-fields";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, allSkills, userSkills] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.skill.findMany({
      where: { NOT: { category: "custom" } },
      select: { slug: true, name: true, category: true },
      orderBy: { name: "asc" },
    }),
    prisma.userSkill.findMany({
      where: { userId: user.id },
      select: { skill: { select: { slug: true, name: true, category: true } } },
    }),
  ]);

  const wa = (profile?.workAuthorizations ?? {}) as Record<string, string>;
  const initial: ProfileFormState = {
    name: user.name ?? "",
    country: profile?.country ?? "",
    city: profile?.city ?? "",
    linkedinUrl: profile?.linkedinUrl ?? "",
    githubUrl: profile?.githubUrl ?? "",
    portfolioUrl: profile?.portfolioUrl ?? "",
    currentTitle: profile?.currentTitle ?? "",
    yearsExperience: profile?.yearsExperience != null ? String(profile.yearsExperience) : "",
    desiredTitles: profile?.desiredTitles ?? [],
    targetCountries: profile?.targetCountries ?? [],
    workPreference: profile?.workPreference ?? "",
    salaryExpectation: profile?.salaryExpectation != null ? String(profile.salaryExpectation) : "",
    salaryCurrency: profile?.salaryCurrency ?? "USD",
    needsSponsorship: profile?.needsSponsorship ?? false,
    workAuthUS: wa.US ?? "",
    workAuthGB: wa.GB ?? "",
  };

  const selectedSlugs = userSkills
    .map((u) => u.skill)
    .filter((s) => s.category !== "custom")
    .map((s) => s.slug);
  const customSkills = userSkills
    .map((u) => u.skill)
    .filter((s) => s.category === "custom")
    .map((s) => s.name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Keep this accurate — every match score and recommendation is built from it.
        </p>
      </div>
      <ProfileEditor
        initial={initial}
        skillOptions={allSkills}
        initialSelectedSlugs={selectedSlugs}
        initialCustomSkills={customSkills}
      />
    </div>
  );
}
