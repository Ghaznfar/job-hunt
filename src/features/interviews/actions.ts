"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { ActionResult, ok, fail, parseInput, runAction } from "@/lib/action";
import {
  generateInterviewQuestions,
  submitInterviewAnswer,
} from "@/services/interview.service";

export async function generateInterviewQuestionsAction(
  jobId: string,
): Promise<ActionResult<{ count: number }>> {
  return runAction("interview.generate", async () => {
    const user = await requireUser();
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } });
    if (!job) return fail("Job not found.");
    const questions = await generateInterviewQuestions(user.id, jobId);
    revalidatePath(`/dashboard/interviews/${jobId}`);
    revalidatePath("/dashboard/interviews");
    return ok({ count: questions.length });
  });
}

const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().trim().min(10, "Write a bit more before submitting.").max(8000),
});

export async function submitInterviewAnswerAction(
  input: unknown,
): Promise<ActionResult<{ feedback: string; improvedAnswer: string }>> {
  return runAction("interview.answer", async () => {
    const user = await requireUser();
    const parsed = parseInput(answerSchema, input);
    if (!parsed.ok) return parsed.result;
    const updated = await submitInterviewAnswer(user.id, parsed.data.questionId, parsed.data.answer);
    revalidatePath(`/dashboard/interviews/${updated.jobId}`);
    return ok({
      feedback: updated.aiFeedback ?? "",
      improvedAnswer: updated.improvedAnswer ?? "",
    });
  });
}
