"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import { ActionResult, ok, parseInput, runAction } from "@/lib/action";
import { resolveSkill, normalizeToken } from "@/lib/skills/normalize";
import { profileSchema, skillsSchema } from "./schema";

export async function saveProfileAction(
  input: unknown,
  opts?: { completeOnboarding?: boolean },
): Promise<ActionResult> {
  return runAction("profile.save", async () => {
    const user = await requireUser();
    const parsed = parseInput(profileSchema, input);
    if (!parsed.ok) return parsed.result;
    const d = parsed.data;

    const workAuthorizations: Record<string, string> = {};
    if (d.workAuthUS) workAuthorizations.US = d.workAuthUS;
    if (d.workAuthGB) workAuthorizations.GB = d.workAuthGB;

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { name: d.name } }),
      prisma.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          country: d.country,
          city: d.city || null,
          linkedinUrl: d.linkedinUrl ?? null,
          githubUrl: d.githubUrl ?? null,
          portfolioUrl: d.portfolioUrl ?? null,
          currentTitle: d.currentTitle || null,
          yearsExperience: d.yearsExperience ?? null,
          desiredTitles: d.desiredTitles,
          targetCountries: d.targetCountries,
          workPreference: d.workPreference ?? null,
          salaryExpectation: d.salaryExpectation ?? null,
          salaryCurrency: d.salaryCurrency || "USD",
          needsSponsorship: d.needsSponsorship,
          workAuthorizations,
          onboardingCompletedAt: opts?.completeOnboarding ? new Date() : undefined,
        },
        update: {
          country: d.country,
          city: d.city || null,
          linkedinUrl: d.linkedinUrl ?? null,
          githubUrl: d.githubUrl ?? null,
          portfolioUrl: d.portfolioUrl ?? null,
          currentTitle: d.currentTitle || null,
          yearsExperience: d.yearsExperience ?? null,
          desiredTitles: d.desiredTitles,
          targetCountries: d.targetCountries,
          workPreference: d.workPreference ?? null,
          salaryExpectation: d.salaryExpectation ?? null,
          salaryCurrency: d.salaryCurrency || "USD",
          needsSponsorship: d.needsSponsorship,
          workAuthorizations,
          ...(opts?.completeOnboarding ? { onboardingCompletedAt: new Date() } : {}),
        },
      }),
    ]);

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");
    return ok(undefined);
  });
}

export async function saveSkillsAction(input: unknown): Promise<ActionResult> {
  return runAction("profile.saveSkills", async () => {
    const user = await requireUser();
    const parsed = parseInput(skillsSchema, input);
    if (!parsed.ok) return parsed.result;

    const slugs = new Set(parsed.data.skillSlugs);

    // Resolve any custom skills that actually map to canonical ones; keep the
    // rest as ad-hoc Skill rows with a `custom` category so matching can ignore them.
    for (const raw of parsed.data.customSkills) {
      const canonical = resolveSkill(raw);
      if (canonical) {
        slugs.add(canonical.slug);
        continue;
      }
      const slug = `custom-${normalizeToken(raw).replace(/\s+/g, "-")}`.slice(0, 60);
      await prisma.skill.upsert({
        where: { slug },
        update: {},
        create: { slug, name: raw.trim(), category: "custom", aliases: [] },
      });
      slugs.add(slug);
    }

    const skillRecords = await prisma.skill.findMany({
      where: { slug: { in: [...slugs] } },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.userSkill.deleteMany({ where: { userId: user.id } }),
      prisma.userSkill.createMany({
        data: skillRecords.map((s) => ({ userId: user.id, skillId: s.id })),
        skipDuplicates: true,
      }),
    ]);

    logger.info({ userId: user.id, count: skillRecords.length }, "skills updated");
    revalidatePath("/dashboard/profile");
    return ok(undefined);
  });
}

export async function completeOnboardingAction(
  profileInput: unknown,
  skillsInput: unknown,
): Promise<ActionResult> {
  const profileRes = await saveProfileAction(profileInput, { completeOnboarding: true });
  if (!profileRes.ok) return profileRes;
  const skillsRes = await saveSkillsAction(skillsInput);
  if (!skillsRes.ok) return skillsRes;
  return ok(undefined);
}
