"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { ActionResult, ok, fail, runAction } from "@/lib/action";
import {
  generateTailoring,
  applyTailoring,
  type TailoringPreview,
} from "@/services/tailoring.service";

export async function generateTailoringAction(
  jobId: string,
  resumeId?: string,
): Promise<ActionResult<TailoringPreview>> {
  return runAction("tailoring.generate", async () => {
    const user = await requireUser();
    let targetResumeId = resumeId;
    if (!targetResumeId) {
      const def = await prisma.resume.findFirst({
        where: { userId: user.id, isDefault: true },
        select: { id: true },
      });
      if (!def) return fail("Upload a CV first, then tailor it for this role.");
      targetResumeId = def.id;
    }
    const preview = await generateTailoring(user.id, targetResumeId, jobId);
    return ok(preview);
  });
}

const applySchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().min(1),
  accepted: z
    .array(z.object({ original: z.string().min(1), improved: z.string().min(1) }))
    .min(1, "Approve at least one change."),
});

export async function applyTailoringAction(
  input: unknown,
): Promise<ActionResult<{ resumeId: string; versionId: string }>> {
  return runAction("tailoring.apply", async () => {
    const user = await requireUser();
    const parsed = applySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request.");
    const version = await applyTailoring(
      user.id,
      parsed.data.resumeId,
      parsed.data.jobId,
      parsed.data.accepted,
    );
    revalidatePath("/dashboard/resumes");
    revalidatePath(`/dashboard/resumes/${parsed.data.resumeId}`);
    return ok({ resumeId: parsed.data.resumeId, versionId: version.id });
  });
}
