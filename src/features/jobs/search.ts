import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const REMOTE_OPTIONS = ["any", "REMOTE", "HYBRID", "ONSITE"] as const;
export const DATE_OPTIONS = ["any", "1", "3", "7", "14", "30"] as const;
export const EXPERIENCE_BANDS = [
  { value: "any", label: "Any experience" },
  { value: "0-2", label: "0–2 years" },
  { value: "2-5", label: "2–5 years" },
  { value: "5-8", label: "5–8 years" },
  { value: "8+", label: "8+ years" },
] as const;

export const jobSearchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  country: z.enum(["any", "US", "GB"]).optional().default("any"),
  remote: z.enum(REMOTE_OPTIONS).optional().default("any"),
  skills: z.array(z.string()).optional().default([]),
  salaryMin: z.coerce.number().int().min(0).max(10_000_000).optional(),
  experience: z
    .enum(EXPERIENCE_BANDS.map((b) => b.value) as [string, ...string[]])
    .optional()
    .default("any"),
  datePosted: z.enum(DATE_OPTIONS).optional().default("any"),
  seniority: z
    .enum(["any", "junior", "mid", "senior", "lead", "staff", "principal"])
    .optional()
    .default("any"),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
});

export type JobSearchInput = z.infer<typeof jobSearchSchema>;

export const PAGE_SIZE = 12;

function experienceOverlap(band: string): Prisma.JobWhereInput | null {
  // A job matches a band if its required-years range overlaps the band range,
  // OR the job has no stated years requirement.
  const ranges: Record<string, [number, number]> = {
    "0-2": [0, 2],
    "2-5": [2, 5],
    "5-8": [5, 8],
    "8+": [8, 99],
  };
  const r = ranges[band];
  if (!r) return null;
  const [lo, hi] = r;
  return {
    OR: [
      { minYearsRequired: null },
      {
        AND: [
          { minYearsRequired: { lte: hi } },
          {
            OR: [
              { maxYearsRequired: null, minYearsRequired: { gte: lo - 2 } },
              { maxYearsRequired: { gte: lo } },
            ],
          },
        ],
      },
    ],
  };
}

export function buildJobWhere(input: JobSearchInput): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [];

  if (input.q) {
    and.push({
      OR: [
        { title: { contains: input.q, mode: "insensitive" } },
        { company: { contains: input.q, mode: "insensitive" } },
        { description: { contains: input.q, mode: "insensitive" } },
      ],
    });
  }
  if (input.country !== "any") and.push({ country: input.country });
  if (input.remote !== "any") and.push({ workArrangement: input.remote });
  if (input.seniority !== "any") and.push({ seniorityLevel: input.seniority });
  if (input.salaryMin && input.salaryMin > 0) {
    and.push({
      OR: [{ salaryMax: { gte: input.salaryMin } }, { salaryMin: { gte: input.salaryMin } }],
    });
  }
  if (input.datePosted !== "any") {
    const days = Number(input.datePosted);
    const since = new Date(Date.now() - days * 86_400_000);
    and.push({ OR: [{ postedAt: { gte: since } }, { postedAt: null, createdAt: { gte: since } }] });
  }
  if (input.experience !== "any") {
    const exp = experienceOverlap(input.experience);
    if (exp) and.push(exp);
  }
  if (input.skills.length) {
    and.push({
      AND: input.skills.map((slug) => ({ jobSkills: { some: { skill: { slug } } } })),
    });
  }

  return and.length ? { AND: and } : {};
}

/** Parse URLSearchParams-shaped record into a validated JobSearchInput. */
export function parseSearchParams(
  sp: Record<string, string | string[] | undefined>,
): JobSearchInput {
  const skills = sp.skills
    ? Array.isArray(sp.skills)
      ? sp.skills
      : sp.skills.split(",").filter(Boolean)
    : [];
  return jobSearchSchema.parse({
    q: sp.q ?? "",
    country: sp.country ?? "any",
    remote: sp.remote ?? "any",
    skills,
    salaryMin: sp.salaryMin ? Number(sp.salaryMin) : undefined,
    experience: sp.experience ?? "any",
    datePosted: sp.datePosted ?? "any",
    seniority: sp.seniority ?? "any",
    page: sp.page ? Number(sp.page) : 1,
  });
}
