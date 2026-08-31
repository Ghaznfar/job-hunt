import "server-only";
import { prisma } from "@/lib/db";
import { resolveSkill, normalizeToken } from "./normalize";

export interface ResolvedSkillRow {
  id: string;
  slug: string;
  name: string;
  canonical: boolean;
}

/**
 * Resolve a list of free-form skill labels to `Skill` rows, creating `custom-*`
 * rows for anything not in the taxonomy. Deduplicates by canonical slug.
 */
export async function ensureSkills(labels: string[]): Promise<ResolvedSkillRow[]> {
  const bySlug = new Map<string, { name: string; canonical: boolean }>();
  for (const raw of labels) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const canonical = resolveSkill(trimmed);
    if (canonical) {
      bySlug.set(canonical.slug, { name: canonical.name, canonical: true });
    } else {
      const slug = `custom-${normalizeToken(trimmed).replace(/\s+/g, "-")}`.slice(0, 60);
      if (slug.length > 7) bySlug.set(slug, { name: trimmed.slice(0, 60), canonical: false });
    }
  }
  if (bySlug.size === 0) return [];

  await prisma.$transaction(
    [...bySlug.entries()].map(([slug, v]) =>
      prisma.skill.upsert({
        where: { slug },
        update: {},
        create: { slug, name: v.name, category: v.canonical ? undefined : "custom", aliases: [] },
      }),
    ),
  );

  const rows = await prisma.skill.findMany({
    where: { slug: { in: [...bySlug.keys()] } },
    select: { id: true, slug: true, name: true, category: true },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    canonical: r.category !== "custom",
  }));
}
