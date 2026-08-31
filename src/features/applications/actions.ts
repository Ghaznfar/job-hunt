"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { ActionResult, ok, fail, parseInput, runAction } from "@/lib/action";
import {
  createApplication,
  updateApplicationFields,
  moveApplication,
  reorderApplications,
  addApplicationNote,
  deleteApplication,
  getApplication,
} from "@/services/application.service";
import {
  createApplicationSchema,
  updateApplicationSchema,
  moveApplicationSchema,
  reorderSchema,
  addNoteSchema,
} from "./schema";
import type { ApplicationStatus } from "@prisma/client";

export async function createApplicationAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction("application.create", async () => {
    const user = await requireUser();
    const parsed = parseInput(createApplicationSchema, input);
    if (!parsed.ok) return parsed.result;
    const app = await createApplication(user.id, {
      ...parsed.data,
      status: parsed.data.status as ApplicationStatus,
    });
    revalidatePath("/dashboard/applications");
    revalidatePath("/dashboard");
    return ok({ id: app!.id });
  });
}

export async function createApplicationFromJobAction(
  jobId: string,
): Promise<ActionResult<{ id: string }>> {
  return runAction("application.createFromJob", async () => {
    const user = await requireUser();
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        title: true,
        company: true,
        url: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
      },
    });
    if (!job) return fail("Job not found.");
    const salary =
      job.salaryMin || job.salaryMax
        ? `${job.salaryCurrency ?? ""} ${job.salaryMin ?? ""}${job.salaryMax ? `–${job.salaryMax}` : ""}`.trim()
        : undefined;
    const app = await createApplication(user.id, {
      jobId,
      company: job.company,
      title: job.title,
      jobUrl: job.url,
      salary,
      status: "SAVED",
    });
    revalidatePath("/dashboard/applications");
    return ok({ id: app!.id });
  });
}

export async function updateApplicationAction(input: unknown): Promise<ActionResult> {
  return runAction("application.update", async () => {
    const user = await requireUser();
    const parsed = parseInput(updateApplicationSchema, input);
    if (!parsed.ok) return parsed.result;
    const { id, status: _status, ...fields } = parsed.data;
    await updateApplicationFields(user.id, id, fields);
    revalidatePath("/dashboard/applications");
    return ok(undefined);
  });
}

export async function moveApplicationAction(input: unknown): Promise<ActionResult> {
  return runAction("application.move", async () => {
    const user = await requireUser();
    const parsed = parseInput(moveApplicationSchema, input);
    if (!parsed.ok) return parsed.result;
    await moveApplication(user.id, parsed.data.id, parsed.data.status as ApplicationStatus);
    revalidatePath("/dashboard/applications");
    revalidatePath("/dashboard");
    return ok(undefined);
  });
}

export async function reorderApplicationsAction(input: unknown): Promise<ActionResult> {
  return runAction("application.reorder", async () => {
    const user = await requireUser();
    const parsed = parseInput(reorderSchema, input);
    if (!parsed.ok) return parsed.result;
    await reorderApplications(
      user.id,
      parsed.data.status as ApplicationStatus,
      parsed.data.orderedIds,
    );
    revalidatePath("/dashboard/applications");
    return ok(undefined);
  });
}

export async function addApplicationNoteAction(input: unknown): Promise<ActionResult> {
  return runAction("application.addNote", async () => {
    const user = await requireUser();
    const parsed = parseInput(addNoteSchema, input);
    if (!parsed.ok) return parsed.result;
    await addApplicationNote(user.id, parsed.data.applicationId, parsed.data.body);
    revalidatePath("/dashboard/applications");
    return ok(undefined);
  });
}

export interface ApplicationDetail {
  id: string;
  company: string;
  title: string;
  jobUrl: string | null;
  salary: string | null;
  status: ApplicationStatus;
  contactName: string | null;
  contactEmail: string | null;
  nextInterviewAt: string | null;
  jobId: string | null;
  notes: { id: string; body: string; createdAt: string }[];
  events: {
    fromStatus: ApplicationStatus | null;
    toStatus: ApplicationStatus;
    createdAt: string;
  }[];
}

export async function getApplicationDetailAction(
  id: string,
): Promise<ActionResult<ApplicationDetail>> {
  return runAction("application.detail", async () => {
    const user = await requireUser();
    const app = await getApplication(user.id, id);
    if (!app) return fail("Application not found.");
    return ok({
      id: app.id,
      company: app.company,
      title: app.title,
      jobUrl: app.jobUrl,
      salary: app.salary,
      status: app.status,
      contactName: app.contactName,
      contactEmail: app.contactEmail,
      nextInterviewAt: app.nextInterviewAt?.toISOString() ?? null,
      jobId: app.jobId,
      notes: app.notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      })),
      events: app.events.map((e) => ({
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  });
}

export async function deleteApplicationAction(id: string): Promise<ActionResult> {
  return runAction("application.delete", async () => {
    const user = await requireUser();
    await deleteApplication(user.id, id);
    revalidatePath("/dashboard/applications");
    revalidatePath("/dashboard");
    return ok(undefined);
  });
}
