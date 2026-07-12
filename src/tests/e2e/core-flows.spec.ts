import { test, expect } from "@playwright/test";

// Baseline browser-level regression tests, written against the built app
// (via `vite preview`) as Phase 3 proof that modularising the v15
// single-file app into TypeScript/Vite preserved its behavior.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("home screen loads with start button and zeroed stats", async ({ page }) => {
  await expect(page.locator("#headerTitle")).toHaveText("El Supremo");
  await expect(page.getByRole("button", { name: /Start Workout/i })).toBeVisible();
  await expect(page.locator(".es-stat").first()).toContainText("0");
});

test("can log and finish a workout, see it in history, PRs and export", async ({ page }) => {
  await page.getByRole("button", { name: /Start Workout/i }).click();
  await expect(page.locator("#headerTitle")).toHaveText("Start");
  await page.locator(".tplcard").filter({ hasText: "Push Heavy" }).click();

  await expect(page.locator("#headerTitle")).toHaveText("Push Heavy");
  const firstRow = page.locator(".setrow").nth(1); // nth(0) is the header row
  await firstRow.locator("input[type=number]").nth(0).fill("80");
  await firstRow.locator("input[type=number]").nth(1).fill("6");

  await page.getByRole("button", { name: /Finish Workout/i }).click();
  await expect(page.locator("#toast")).toContainText("Push Heavy saved");
  await expect(page.locator("#headerTitle")).toHaveText("El Supremo");
  await expect(page.locator(".es-stat").first()).toContainText("1");

  // history
  await page.locator("[data-nav='sheet']").click();
  await expect(page.locator(".wblock")).toContainText("Push Heavy");
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

test("template-specific autofill only pulls from the same template", async ({ page }) => {
  // log a Push Heavy bench press set
  await page.getByRole("button", { name: /Start Workout/i }).click();
  await page.locator(".tplcard").filter({ hasText: "Push Heavy" }).click();
  const heavyRow = page.locator(".setrow").nth(1);
  await heavyRow.locator("input[type=number]").nth(0).fill("80");
  await heavyRow.locator("input[type=number]").nth(1).fill("6");
  await page.getByRole("button", { name: /Finish Workout/i }).click();

  // start Push Volume — its Bench Press row must NOT autofill 80/6 from the Heavy session
  await page.getByRole("button", { name: /Start Workout/i }).click();
  await page.locator(".tplcard").filter({ hasText: "Push Volume" }).click();
  const volumeRow = page.locator(".setrow").nth(1);
  await expect(volumeRow.locator("input[type=number]").nth(0)).toHaveValue("");
});

test("hardware/browser back navigation works between tabs", async ({ page }) => {
  await page.locator("[data-nav='sheet']").click();
  await expect(page.locator("#headerTitle")).toHaveText("Log");
  await page.goBack();
  await expect(page.locator("#headerTitle")).toHaveText("El Supremo");
});

test("discard confirmation prevents accidental loss of an in-progress workout", async ({ page }) => {
  await page.getByRole("button", { name: /Start Workout/i }).click();
  await page.locator(".tplcard").filter({ hasText: "Pull Heavy" }).click();
  await page.getByRole("button", { name: /^Discard$/ }).click();
  await expect(page.locator("#modal .mtitle")).toContainText("Discard workout?");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("#headerTitle")).toHaveText("Pull Heavy");
});
