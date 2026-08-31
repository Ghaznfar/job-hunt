import { z } from "zod";
import { structuredResumeSchema } from "@/lib/ai/types";

export const editableResumeSchema = structuredResumeSchema;
export type EditableResume = z.infer<typeof editableResumeSchema>;

export const createResumeSchema = z.object({
  name: z.string().trim().min(1, "Give this CV a name").max(80),
});

export const renameResumeSchema = z.object({
  resumeId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(80),
});
