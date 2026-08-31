"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { signOut } from "@/auth";
import { hashPassword, verifyPassword, passwordSchema } from "@/lib/auth/password";
import { logger } from "@/lib/logger";
import { ActionResult, ok, fail, parseInput, runAction } from "@/lib/action";
import { deleteObject } from "@/lib/storage";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).optional().or(z.literal("")),
    newPassword: passwordSchema,
    confirm: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export async function changePasswordAction(input: FormData | unknown): Promise<ActionResult> {
  return runAction("settings.changePassword", async () => {
    const user = await requireUser();
    const parsed = parseInput(changePasswordSchema, input);
    if (!parsed.ok) return parsed.result;

    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { hashedPassword: true },
    });

    // If the user already has a password, require the current one.
    if (record?.hashedPassword) {
      const okCurrent = await verifyPassword(parsed.data.currentPassword || "", record.hashedPassword);
      if (!okCurrent) return fail("Your current password is incorrect.", { currentPassword: ["Incorrect password"] });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword: await hashPassword(parsed.data.newPassword) },
    });
    logger.info({ userId: user.id }, "password changed");
    return ok(undefined);
  });
}

const deleteSchema = z.object({ confirm: z.string() });

export async function deleteAccountAction(input: FormData | unknown): Promise<ActionResult> {
  const result = await runAction("settings.deleteAccount", async () => {
    const user = await requireUser();
    const parsed = parseInput(deleteSchema, input);
    if (!parsed.ok) return parsed.result;
    if (parsed.data.confirm.trim().toUpperCase() !== "DELETE") {
      return fail('Type "DELETE" to confirm.', { confirm: ['Type "DELETE" to confirm'] });
    }

    // Best-effort removal of stored CV files before the cascade delete.
    const resumes = await prisma.resume.findMany({
      where: { userId: user.id, fileKey: { not: null } },
      select: { fileKey: true },
    });
    for (const r of resumes) {
      if (r.fileKey) await deleteObject(r.fileKey).catch(() => undefined);
    }

    await prisma.user.delete({ where: { id: user.id } });
    logger.info({ userId: user.id }, "account deleted");
    return ok(undefined);
  });

  if (result.ok) {
    await signOut({ redirect: false });
    redirect("/?deleted=1");
  }
  return result;
}

export async function exportMyDataAction(): Promise<ActionResult<string>> {
  return runAction("settings.exportData", async () => {
    const user = await requireUser();
    const data = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        userSkills: { include: { skill: true } },
        resumes: { include: { versions: { include: { experiences: true, educations: true } } } },
        savedJobs: true,
        applications: { include: { notes: true, events: true, interviews: true } },
        coverLetters: true,
        interviewQuestions: true,
        jobMatches: true,
        subscription: true,
      },
    });
    // Strip file keys / internal ids that aren't useful to the user.
    return ok(JSON.stringify(data, null, 2));
  });
}
