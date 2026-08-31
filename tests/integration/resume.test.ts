import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { testDb, resetDb, disconnectDb } from "../helpers/db";
import { SKILL_TAXONOMY } from "@/lib/skills/taxonomy";
import {
  createBlankResume,
  saveVersionContent,
  getCurrentVersion,
  versionToStructured,
  setDefaultResume,
  createVersion,
  setCurrentVersion,
  deleteResume,
} from "@/services/resume.service";
import type { StructuredResume } from "@/lib/ai/types";

let userId: string;
let otherUserId: string;

beforeAll(async () => {
  await resetDb();
  // Seed the skill catalogue the service relies on.
  for (const s of SKILL_TAXONOMY.slice(0, 20)) {
    await testDb.skill.upsert({
      where: { slug: s.slug },
      update: {},
      create: { slug: s.slug, name: s.name, category: s.category, aliases: s.aliases },
    });
  }
});
afterAll(async () => {
  await resetDb();
  await disconnectDb();
});
beforeEach(async () => {
  await testDb.user.deleteMany();
  const u = await testDb.user.create({ data: { email: "r1@example.com" } });
  const o = await testDb.user.create({ data: { email: "r2@example.com" } });
  userId = u.id;
  otherUserId = o.id;
});

const sample: StructuredResume = {
  fullName: "Test",
  email: "",
  phone: "",
  location: "",
  links: [],
  summary: "DevOps engineer",
  experience: [
    {
      company: "Acme",
      title: "DevOps Engineer",
      location: "",
      startDate: "2021",
      endDate: "",
      current: true,
      bullets: ["Ran Kubernetes"],
      techs: ["Kubernetes"],
    },
  ],
  education: [
    { institution: "Uni", degree: "BSc", field: "CS", startDate: "", endDate: "2020", grade: "" },
  ],
  skills: ["AWS", "Kubernetes", "Terraform"],
  certifications: [{ name: "CKA", issuer: "CNCF" }],
  projects: [],
  languages: [{ name: "English", proficiency: "Native" }],
};

describe("resume service", () => {
  it("creates a blank resume with a current version and marks the first as default", async () => {
    const resume = await createBlankResume(userId, "My CV");
    expect(resume.isDefault).toBe(true);
    expect(resume.versions).toHaveLength(1);
    expect(resume.versions[0].isCurrent).toBe(true);

    const second = await createBlankResume(userId, "Second CV");
    expect(second.isDefault).toBe(false);
  });

  it("saves and reads back structured content (roundtrip)", async () => {
    const resume = await createBlankResume(userId, "CV");
    await saveVersionContent(userId, resume.versions[0].id, sample);

    const current = await getCurrentVersion(userId, resume.id);
    expect(current).toBeTruthy();
    const structured = versionToStructured(current!);
    expect(structured.summary).toBe("DevOps engineer");
    expect(structured.experience[0].company).toBe("Acme");
    expect(structured.skills.sort()).toEqual(["AWS", "Kubernetes", "Terraform"]);
    expect(structured.certifications[0].name).toBe("CKA");
  });

  it("prevents editing another user's resume version", async () => {
    const resume = await createBlankResume(userId, "CV");
    await expect(saveVersionContent(otherUserId, resume.versions[0].id, sample)).rejects.toThrow(
      /not found/i,
    );
  });

  it("creates a TAILORED version and can switch the current pointer", async () => {
    const resume = await createBlankResume(userId, "CV");
    await saveVersionContent(userId, resume.versions[0].id, sample);
    const v2 = await createVersion(userId, resume.id, sample, {
      label: "Tailored for X",
      source: "TAILORED",
      makeCurrent: true,
    });
    const current = await getCurrentVersion(userId, resume.id);
    expect(current?.id).toBe(v2.id);

    await setCurrentVersion(userId, resume.id, resume.versions[0].id);
    const back = await getCurrentVersion(userId, resume.id);
    expect(back?.id).toBe(resume.versions[0].id);
  });

  it("reassigns default when the default resume is deleted", async () => {
    const a = await createBlankResume(userId, "A");
    const b = await createBlankResume(userId, "B");
    expect(a.isDefault).toBe(true);
    await deleteResume(userId, a.id);
    const remaining = await testDb.resume.findUnique({ where: { id: b.id } });
    expect(remaining?.isDefault).toBe(true);
  });

  it("won't delete a resume the user does not own", async () => {
    const a = await createBlankResume(userId, "A");
    await expect(deleteResume(otherUserId, a.id)).rejects.toThrow(/not found/i);
  });
});
