import { z } from "zod";
import { STATUS_ORDER } from "./constants";

const statusEnum = z.enum(STATUS_ORDER as [string, ...string[]]);

export const createApplicationSchema = z.object({
  jobId: z.string().optional(),
  company: z.string().trim().min(1, "Company is required").max(160),
  title: z.string().trim().min(1, "Job title is required").max(160),
  jobUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || /^https?:\/\/.+/.test(v), "Must be a URL"),
  salary: z.string().trim().max(80).optional(),
  status: statusEnum.default("SAVED"),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || /.+@.+\..+/.test(v), "Must be an email"),
  nextInterviewAt: z.string().optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const updateApplicationSchema = createApplicationSchema.partial().extend({
  id: z.string().min(1),
});

export const moveApplicationSchema = z.object({
  id: z.string().min(1),
  status: statusEnum,
});

export const reorderSchema = z.object({
  status: statusEnum,
  orderedIds: z.array(z.string()).max(500),
});

export const addNoteSchema = z.object({
  applicationId: z.string().min(1),
  body: z.string().trim().min(1, "Note can't be empty").max(4000),
});
