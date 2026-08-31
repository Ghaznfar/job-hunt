import { test, expect } from "@playwright/test";

/**
 * Core journey smoke test against the seeded demo account.
 * Requires: `npm run db:seed` has been run against the DATABASE_URL the server uses.
 * Seeded login: demo@jobhunt.test / password123 (onboarding already complete).
 */

test("public site renders and links work", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /find the jobs worth applying to/i }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: /pricing/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByText(/\$9\.99/)).toBeVisible();
});

test("log in and walk the core dashboard flow", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@jobhunt.test");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /^log in$/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: /good (morning|afternoon|evening)/i }),
  ).toBeVisible();

  // Job search
  await page.goto("/dashboard/jobs");
  await expect(page.getByRole("heading", { name: "Job Search" })).toBeVisible();
  const firstJob = page.locator("a[href^='/dashboard/jobs/']").first();
  await expect(firstJob).toBeVisible();
  await firstJob.click();
  await expect(page).toHaveURL(/\/dashboard\/jobs\/.+/);

  // Should I apply — run analysis
  await page.getByRole("button", { name: /analyze this job/i }).click();
  await expect(page.getByText(/should i apply\?/i)).toBeVisible();
  await expect(
    page.getByText(/overall match|verdict|apply|maybe|don't apply/i).first(),
  ).toBeVisible({
    timeout: 15_000,
  });

  // Save the job
  const saveBtn = page.getByRole("button", { name: /^save$/i }).first();
  if (await saveBtn.isVisible().catch(() => false)) {
    await saveBtn.click();
    await expect(page.getByRole("button", { name: /saved/i }).first()).toBeVisible();
  }

  // Applications board
  await page.goto("/dashboard/applications");
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  await expect(page.getByText(/response rate/i)).toBeVisible();
});
