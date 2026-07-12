import { test, expect, type Page } from "@playwright/test";

// Baseline browser-level regression tests for the Phase 5 app: onboarding
// gate, starter-plan/manual/mentor plan creation, workout execution,
// history/PR/export, and navigation — run against the built app via
// `vite preview`, in real Chromium (needed for the real SQLite/WASM path).

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-migration-status", "completed", { timeout: 15_000 });
});

async function pickStarterPlan(page: Page, name: string): Promise<void> {
  await expect(page.locator("#headerTitle")).toHaveText("Welcome");
  await page.locator("#starterBtn").click();
  await page.locator(".progress-option").filter({ hasText: name }).click();
  await expect(page.locator("#headerTitle")).toHaveText("El Supremo");
}

test("fresh install shows onboarding, not the home dashboard", async ({ page }) => {
  await expect(page.locator("#headerTitle")).toHaveText("Welcome");
  await expect(page.locator("#mentorBtn")).toBeVisible();
  await expect(page.locator("#manualBtn")).toBeVisible();
  await expect(page.locator("#starterBtn")).toBeVisible();
  await expect(page.locator("#importBtn")).toBeVisible();
});

test("starter plan onboarding creates a plan and lands on home with zeroed stats", async ({ page }) => {
  await pickStarterPlan(page, "Push / Pull / Legs");
  await expect(page.getByRole("button", { name: /Start Workout/i })).toBeVisible();
  await expect(page.locator(".es-stat").first()).toContainText("0");
});

test("can log and finish a workout, see it in history, PRs and export", async ({ page }) => {
  await pickStarterPlan(page, "Push / Pull / Legs");
  await page.getByRole("button", { name: /Start Workout/i }).click();
  await expect(page.locator("#headerTitle")).toHaveText("Start");
  await page.locator(".tplcard").filter({ hasText: "Push" }).first().click();

  await expect(page.locator("#headerTitle")).toHaveText("Push");
  const firstRow = page.locator(".setrow").nth(1);
  await firstRow.locator("input[type=number]").nth(0).fill("80");
  await firstRow.locator("input[type=number]").nth(1).fill("6");

  await page.getByRole("button", { name: /Finish Workout/i }).click();
  await page.getByRole("button", { name: /^Finish$/ }).click();
  await expect(page.locator("#toast")).toContainText("Push saved");
  await expect(page.locator("#headerTitle")).toHaveText("El Supremo");
  await expect(page.locator(".es-stat").first()).toContainText("1");

  // history
  await page.locator("[data-nav='sheet']").click();
  await expect(page.locator(".wblock")).toContainText("Push");
  await expect(page.locator(".wblock")).toContainText("80kg");

  // PRs
  await page.locator("[data-nav='prs']").click();
  await expect(page.locator(".prs-row")).toContainText("Bench Press");
  await expect(page.locator(".prs-row")).toContainText("80kg");

  // export
  await page.locator("[data-nav='export']").click();
  await expect(page.locator("#exportBox")).toContainText("Bench Press");
  await expect(page.locator("#exportBox")).toContainText("80kg x 6");
});

test("workout-day-specific autofill only pulls from the same day, even for the identical exercise", async ({ page }) => {
  // Build two custom days that BOTH contain Bench Press, to unambiguously
  // test day-scoped autofill isolation (starter/mentor plans avoid
  // repeating the same exercise across different days by design).
  await page.locator("#manualBtn").click();
  await page.locator("#createPlanBtn").click();
  await page.locator("#modalInput").fill("Autofill Test Plan");
  await page.locator("[data-modal-submit]").click();

  for (const dayName of ["Day A", "Day B"]) {
    await page.locator("#addDayBtn").click();
    await page.locator("#modalInput").fill(dayName);
    await page.locator("[data-modal-submit]").click();
    // Newly created days open automatically (planDetail.ts sets openDayId to
    // the new day), so the "+ Add exercise" button for THIS day is the only
    // one rendered right now.
    await page.locator("[data-add-ex]").click();
    await page.locator("#exPickerInput").fill("Bench Press");
    await page.locator("[data-pick]").first().click();
  }

  await page.locator("#backBtn").click(); // planDetail -> Plans (bottom nav is hidden on planDetail)
  await expect(page.locator("#headerTitle")).toHaveText("Plans");
  await page.locator("[data-nav='home']").click();
  await page.getByRole("button", { name: /Start Workout/i }).click();
  await page.locator(".tplcard").filter({ hasText: "Day A" }).click();
  const dayARow = page.locator(".setrow").nth(1);
  await dayARow.locator("input[type=number]").nth(0).fill("80");
  await dayARow.locator("input[type=number]").nth(1).fill("6");
  await page.getByRole("button", { name: /Finish Workout/i }).click();
  await page.getByRole("button", { name: /^Finish$/ }).click();

  await page.getByRole("button", { name: /Start Workout/i }).click();
  await page.locator(".tplcard").filter({ hasText: "Day B" }).click();
  const dayBRow = page.locator(".setrow").nth(1);
  await expect(dayBRow.locator("input[type=number]").nth(0)).toHaveValue("");
});

test("hardware/browser back navigation works between tabs", async ({ page }) => {
  await pickStarterPlan(page, "Full Body (3x/week)");
  await page.locator("[data-nav='sheet']").click();
  await expect(page.locator("#headerTitle")).toHaveText("Log");
  await page.goBack();
  await expect(page.locator("#headerTitle")).toHaveText("El Supremo");
});

test("discard confirmation prevents accidental loss of an in-progress workout", async ({ page }) => {
  await pickStarterPlan(page, "Bodyweight Only");
  await page.getByRole("button", { name: /Start Workout/i }).click();
  await page.locator(".tplcard").first().click();
  await page.getByRole("button", { name: /^Discard$/ }).click();
  await expect(page.locator("#modal .mtitle")).toContainText("Discard workout?");
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("manual plan building: create a plan, add a day and an exercise, then start a workout from it", async ({ page }) => {
  await expect(page.locator("#headerTitle")).toHaveText("Welcome");
  await page.locator("#manualBtn").click();
  await expect(page.locator("#headerTitle")).toHaveText("Plans");

  await page.locator("#createPlanBtn").click();
  await page.locator("#modalInput").fill("My Custom Plan");
  await page.locator("[data-modal-submit]").click();
  await expect(page.locator("#headerTitle")).toHaveText("Edit Plan");

  await page.locator("#addDayBtn").click();
  await page.locator("#modalInput").fill("Custom Day");
  await page.locator("[data-modal-submit]").click();
  // The newly created day opens automatically (planDetail.ts sets
  // openDayId to it) — no extra toggle click needed.

  await page.locator("[data-add-ex]").click();
  await page.locator("#exPickerInput").fill("Bench");
  await page.locator("[data-pick]").first().click();
  await expect(page.locator("[data-ex-row]")).toHaveCount(1);

  await page.locator("#backBtn").click(); // planDetail -> Plans (bottom nav is hidden on planDetail)
  await expect(page.locator("#headerTitle")).toHaveText("Plans");
  await page.locator("[data-nav='home']").click();
  await page.getByRole("button", { name: /Start Workout/i }).click();
  await expect(page.locator(".tplcard").filter({ hasText: "Custom Day" })).toBeVisible();
});

test("mentor questionnaire generates a plan that can be accepted", async ({ page }) => {
  await expect(page.locator("#headerTitle")).toHaveText("Welcome");
  await page.locator("#mentorBtn").click();
  await expect(page.locator("#headerTitle")).toHaveText("Mentor");
  await page.locator("#generateBtn").click();
  await expect(page.locator("#headerTitle")).toHaveText("Your Plan");
  await expect(page.locator(".wblock").first()).toBeVisible();
  await page.locator("#acceptBtn").click();
  await expect(page.locator("#headerTitle")).toHaveText("El Supremo");
  await expect(page.getByRole("button", { name: /Start Workout/i })).toBeVisible();
});

test("privacy centre erase-all-data returns to onboarding", async ({ page }) => {
  await pickStarterPlan(page, "Full Body (3x/week)");
  await page.locator("[data-nav='export']").click();
  await page.locator("#privacyBtn").click();
  await expect(page.locator("#headerTitle")).toHaveText("Privacy");
  await page.locator("#eraseBtn").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator("#modalInput").fill("DELETE");
  await page.locator("[data-modal-submit]").click();
  await expect(page.locator("#headerTitle")).toHaveText("Welcome");
});
