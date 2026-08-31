"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { ActionResult, ok, fail, runAction } from "@/lib/action";
import { runIngestion } from "@/services/ingestion.service";

export async function saveJobAction(jobId: string): Promise<ActionResult<{ saved: boolean }>> {
  return runAction("jobs.save", async () => {
    const user = await requireUser();
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } });
    if (!job) return fail("Job not found.");
    await prisma.savedJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId } },
      create: { userId: user.id, jobId },
      update: {},
    });
    revalidatePath("/dashboard/jobs");
    revalidatePath(`/dashboard/jobs/${jobId}`);
    return ok({ saved: true });
  });
}

export async function unsaveJobAction(jobId: string): Promise<ActionResult<{ saved: boolean }>> {
  return runAction("jobs.unsave", async () => {
    const user = await requireUser();
    await prisma.savedJob.deleteMany({ where: { userId: user.id, jobId } });
    revalidatePath("/dashboard/jobs");
    revalidatePath(`/dashboard/jobs/${jobId}`);
    return ok({ saved: false });
  });
}

/** Admin-triggered manual ingestion run. */
export async function triggerIngestionAction(): Promise<ActionResult<{ summary: string }>> {
  return runAction("jobs.ingest", async () => {
    await requireAdmin();
    const results = await runIngestion({ limitPerProvider: 150 });
    const summary = results
      .map((r) => `${r.provider}: +${r.created} new, ${r.updated} updated, ${r.duplicates} dup`)
      .join(" · ");
    revalidatePath("/dashboard/jobs");
    revalidatePath("/admin/jobs");
    return ok({ summary });
  });
}
