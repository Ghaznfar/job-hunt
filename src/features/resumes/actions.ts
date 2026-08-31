"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { MAX_UPLOAD_BYTES, ACCEPTED_MIME } from "@/lib/cv/parse";
import { ActionResult, ok, fail, parseInput, runAction } from "@/lib/action";
import {
  createResumeFromUpload,
  createBlankResume,
  saveVersionContent,
  setDefaultResume,
  renameResume,
  deleteResume,
  setCurrentVersion,
} from "@/services/resume.service";
import { editableResumeSchema, createResumeSchema, renameResumeSchema } from "./schema";

export async function uploadResumeAction(form: FormData): Promise<ActionResult<{ resumeId: string }>> {
  return runAction("resume.upload", async () => {
    const user = await requireUser();
    const file = form.get("file");
    const nameRaw = String(form.get("name") || "").trim();

    if (!(file instanceof File) || file.size === 0) return fail("Choose a PDF or DOCX file to upload.");
    if (file.size > MAX_UPLOAD_BYTES) {
      return fail(`File is too large. Maximum size is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.`);
    }
    if (!ACCEPTED_MIME[file.type] && !/\.(pdf|docx)$/i.test(file.name)) {
      return fail("Unsupported file type. Upload a PDF or DOCX.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const name = nameRaw || file.name.replace(/\.(pdf|docx)$/i, "") || "My CV";

    const resume = await createResumeFromUpload({
      userId: user.id,
      name,
      filename: file.name,
      mime: file.type || (/\.pdf$/i.test(file.name) ? "application/pdf" : ""),
      bytes,
    });

    revalidatePath("/dashboard/resumes");
    revalidatePath("/dashboard");
    return ok({ resumeId: resume.id });
  });
}

export async function createBlankResumeAction(input: unknown): Promise<ActionResult<{ resumeId: string }>> {
  return runAction("resume.createBlank", async () => {
    const user = await requireUser();
    const parsed = parseInput(createResumeSchema, input);
    if (!parsed.ok) return parsed.result;
    const resume = await createBlankResume(user.id, parsed.data.name);
    revalidatePath("/dashboard/resumes");
    return ok({ resumeId: resume.id });
  });
}

const saveSchema = z.object({
  versionId: z.string().min(1),
  data: editableResumeSchema,
  label: z.string().trim().max(80).optional(),
});

export async function saveResumeVersionAction(input: unknown): Promise<ActionResult> {
  return runAction("resume.saveVersion", async () => {
    const user = await requireUser();
    const parsed = saveSchema.safeParse(input);
    if (!parsed.success) return fail("Some résumé fields are invalid.");
    await saveVersionContent(user.id, parsed.data.versionId, parsed.data.data, {
      label: parsed.data.label,
    });
    revalidatePath("/dashboard/resumes");
    return ok(undefined);
  });
}

export async function setDefaultResumeAction(resumeId: string): Promise<ActionResult> {
  return runAction("resume.setDefault", async () => {
    const user = await requireUser();
    await setDefaultResume(user.id, resumeId);
    revalidatePath("/dashboard/resumes");
    return ok(undefined);
  });
}

export async function renameResumeAction(input: unknown): Promise<ActionResult> {
  return runAction("resume.rename", async () => {
    const user = await requireUser();
    const parsed = parseInput(renameResumeSchema, input);
    if (!parsed.ok) return parsed.result;
    await renameResume(user.id, parsed.data.resumeId, parsed.data.name);
    revalidatePath("/dashboard/resumes");
    return ok(undefined);
  });
}

export async function deleteResumeAction(resumeId: string): Promise<ActionResult> {
  return runAction("resume.delete", async () => {
    const user = await requireUser();
    await deleteResume(user.id, resumeId);
    revalidatePath("/dashboard/resumes");
    return ok(undefined);
  });
}

export async function setCurrentVersionAction(
  resumeId: string,
  versionId: string,
): Promise<ActionResult> {
  return runAction("resume.setCurrentVersion", async () => {
    const user = await requireUser();
    await setCurrentVersion(user.id, resumeId, versionId);
    revalidatePath("/dashboard/resumes");
    return ok(undefined);
  });
}

export async function getResumeDownloadUrlAction(
  resumeId: string,
): Promise<ActionResult<{ url: string }>> {
  return runAction("resume.downloadUrl", async () => {
    const user = await requireUser();
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: user.id },
      select: { fileKey: true },
    });
    if (!resume?.fileKey) return fail("This CV has no uploaded file.");
    const url = await getStorage().getSignedUrl(resume.fileKey, 300);
    return ok({ url });
  });
}
