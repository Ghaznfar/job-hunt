import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SKILL_TAXONOMY } from "../src/lib/skills/taxonomy";

const prisma = new PrismaClient();

async function seedSkills() {
  for (const skill of SKILL_TAXONOMY) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: { name: skill.name, category: skill.category, aliases: skill.aliases },
      create: {
        slug: skill.slug,
        name: skill.name,
        category: skill.category,
        aliases: skill.aliases,
      },
    });
  }
  console.log(`  ✓ ${SKILL_TAXONOMY.length} skills`);
}

async function seedJobSources() {
  const sources = [
    { key: "mock", name: "Demo dataset", enabled: true },
    { key: "adzuna", name: "Adzuna API", enabled: false },
  ];
  for (const s of sources) {
    await prisma.jobSource.upsert({
      where: { key: s.key },
      update: { name: s.name },
      create: s,
    });
  }
  console.log(`  ✓ ${sources.length} job sources`);
}

async function seedUsers() {
  const adminEmail = (process.env.ADMIN_EMAILS || "admin@jobhunt.test")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const password = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      hashedPassword: password,
      emailVerified: new Date(),
      profile: { create: { onboardingCompletedAt: new Date() } },
      subscription: { create: { plan: "PRO", status: "ACTIVE" } },
    },
  });

  const demo = await prisma.user.upsert({
    where: { email: "demo@jobhunt.test" },
    update: {},
    create: {
      email: "demo@jobhunt.test",
      name: "Demo User",
      hashedPassword: password,
      emailVerified: new Date(),
      profile: {
        create: {
          country: "GB",
          city: "London",
          currentTitle: "DevOps Engineer",
          yearsExperience: 2,
          desiredTitles: ["DevOps Engineer", "Cloud Engineer", "SRE"],
          targetCountries: ["GB", "US"],
          workPreference: "REMOTE",
          salaryExpectation: 65000,
          salaryCurrency: "GBP",
          workAuthorizations: { GB: "CITIZEN", US: "NEEDS_SPONSORSHIP" },
          needsSponsorship: true,
        },
      },
      subscription: { create: { plan: "FREE", status: "ACTIVE" } },
    },
  });

  console.log(
    `  ✓ users: ${admin.email} (ADMIN, pw: password123), ${demo.email} (FREE, pw: password123)`,
  );
}

async function seedJobs() {
  const { runIngestion } = await import("../src/services/ingestion.service");
  const results = await runIngestion({ limitPerProvider: 200 });
  for (const r of results) {
    console.log(`  ✓ ${r.provider}: ${r.created} new, ${r.updated} updated, ${r.duplicates} dup`);
  }
}

async function main() {
  console.log("Seeding database…");
  await seedSkills();
  await seedJobSources();
  await seedUsers();
  await seedJobs();
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
