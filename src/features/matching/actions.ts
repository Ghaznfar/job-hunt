"use server";

import { revalidatePath } from "next/cache";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { ActionResult, ok, fail, runAction } from "@/lib/action";
import { analyzeMatch } from "@/services/matching.service";
import { guardUserRate } from "@/lib/rate-guard";

export async function analyzeMatchAction(
  jobId: string,
): Promise<ActionResult<{ jobId: string; verdict: string }>> {
  return runAction("matching.analyze", async () => {
    const user = await requireOnboardedUser();
    await guardUserRate(user.id, "match");

    const hasResume = await prisma.resume.count({ where: { userId: user.id } });
    if (hasResume === 0) {
      return fail("Upload a CV first so we can match against your real experience.");
    }

    const { match } = await analyzeMatch(user.id, jobId);
    revalidatePath(`/dashboard/match/${jobId}`);
    revalidatePath(`/dashboard/jobs/${jobId}`);
    revalidatePath("/dashboard");
    return ok({ jobId, verdict: match.verdict });
  });
}
