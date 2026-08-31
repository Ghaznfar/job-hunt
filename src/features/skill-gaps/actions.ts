"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { guardUserRate } from "@/lib/rate-guard";
import { ActionResult, ok, fail, runAction } from "@/lib/action";
import { generateSkillGapReport, type SkillGapView } from "@/services/skill-gap.service";

export async function generateSkillGapAction(): Promise<ActionResult<SkillGapView>> {
  return runAction("skillGap.generate", async () => {
    const user = await requireUser();
    await guardUserRate(user.id, "skill-gap");
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { desiredTitles: true },
    });
    if (!profile?.desiredTitles.length) {
      return fail("Add target roles to your profile first.");
    }
    const report = await generateSkillGapReport(user.id);
    revalidatePath("/dashboard/skill-gaps");
    revalidatePath("/dashboard");
    return ok(report);
  });
}
