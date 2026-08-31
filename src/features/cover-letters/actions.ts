"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { ActionResult, ok, fail, parseInput, runAction } from "@/lib/action";
import { guardUserRate } from "@/lib/rate-guard";
import {
  generateCoverLetter,
  updateCoverLetter,
  deleteCoverLetter,
  type CoverLetterTone,
} from "@/services/cover-letter.service";

const TONES = ["professional", "enthusiastic", "concise", "warm"] as const;

const generateSchema = z.object({
  jobId: z.string().min(1),
  tone: z.enum(TONES).default("professional"),
});

export async function generateCoverLetterAction(
  input: unknown,
): Promise<ActionResult<{ id: string; content: string }>> {
  return runAction("coverLetter.generate", async () => {
    const user = await requireUser();
    const parsed = parseInput(generateSchema, input);
    if (!parsed.ok) return parsed.result;
    await guardUserRate(user.id, "cover-letter");

    const hasResume = await prisma.resume.count({ where: { userId: user.id } });
    if (hasResume === 0) return fail("Add a CV first so the letter can reference your background.");

    const { coverLetter } = await generateCoverLetter(
      user.id,
      parsed.data.jobId,
      parsed.data.tone as CoverLetterTone,
    );
    revalidatePath("/dashboard/cover-letters");
    return ok({ id: coverLetter.id, content: coverLetter.content });
  });
}

const updateSchema = z.object({ id: z.string().min(1), content: z.string().min(1).max(20000) });

export async function updateCoverLetterAction(input: unknown): Promise<ActionResult> {
  return runAction("coverLetter.update", async () => {
    const user = await requireUser();
    const parsed = parseInput(updateSchema, input);
    if (!parsed.ok) return parsed.result;
    await updateCoverLetter(user.id, parsed.data.id, parsed.data.content);
    revalidatePath("/dashboard/cover-letters");
    return ok(undefined);
  });
}

export async function deleteCoverLetterAction(id: string): Promise<ActionResult> {
  return runAction("coverLetter.delete", async () => {
    const user = await requireUser();
    await deleteCoverLetter(user.id, id);
    revalidatePath("/dashboard/cover-letters");
    return ok(undefined);
  });
}
