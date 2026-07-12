import { test, expect } from "@playwright/test";

// Proves the ads/privacy boundary holds: distinctive ("canary") workout
// content is logged, then every network request the page makes — across
// onboarding, workout logging, and all four ad-permitted landing screens
// (home, history, progress, plan library) — is captured and asserted to
// never contain it. AdMob itself only runs on native Android
// (Capacitor.isNativePlatform() gates it — see src/ads/adMobAdapter.ts),
// so no ad network calls happen in this browser test; what this test
// verifies is the boundary our OWN code controls: nothing in
// screens/database/exports ever puts workout content on the wire, no
// matter which screen is showing an ad placement.

const CANARY_EXERCISE = "ZzCanaryLift9182";
const CANARY_NOTE = "Zz-canary-note-4471-do-not-leak";
const CANARY_WEIGHT = "914182";

test("no workout content appears in any outgoing network request across ad-permitted screens", async ({ page }) => {
  const requestSnippets: string[] = [];
  page.on("request", (req) => {
    requestSnippets.push(req.url());
    const data = req.postData();
    if (data) requestSnippets.push(data);
    for (const [k, v] of Object.entries(req.headers())) requestSnippets.push(`${k}:${v}`);
  });

  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-migration-status", "completed", { timeout: 15_000 });

  // Onboarding -> starter plan (exercises the onboarding + plan-creation network surface).
  await page.locator("#starterBtn").click();
  await page.locator(".progress-option").filter({ hasText: "Push / Pull / Legs" }).click();
  await expect(page.getByRole("button", { name: /Start Workout/i })).toBeVisible();

  // Log a workout containing the canary exercise/weight/note (session screen —
  // never an ad-permitted placement, but also must never leak anything).
  await page.getByRole("button", { name: /Start Workout/i }).click();
  await page.locator(".tplcard").first().click();
  const firstRow = page.locator(".setrow").nth(1);
  await firstRow.locator("input[type=number]").nth(0).fill(CANARY_WEIGHT);
  await firstRow.locator("input[type=number]").nth(1).fill("6");
  await page.locator("[data-action='addExercise']").click();
  await page.locator("#exPickerInput").fill(CANARY_EXERCISE);
  await page.locator("#exPickerCreate").click();
  // Wait for the re-render that adds the canary exercise's card before
  // targeting its row — otherwise .setrow.last() can resolve to whatever
  // was last in the DOM a moment ago (e.g. an existing template exercise).
  await expect(page.locator(".exname").filter({ hasText: CANARY_EXERCISE })).toBeVisible();
  // finishSession() drops exercises with no logged sets — log one so the
  // canary exercise actually survives into history/PRs/export below.
  const canaryRow = page.locator(".setrow").last();
  await canaryRow.locator("input[type=number]").nth(0).fill(CANARY_WEIGHT);
  await canaryRow.locator("input[type=number]").nth(1).fill("5");
  await page.locator("[data-action='exNotes']").last().fill(CANARY_NOTE);
  await page.getByRole("button", { name: /Finish Workout/i }).click();
  await page.getByRole("button", { name: /^Finish$/ }).click();

  // Visit all four ad-permitted landing screens (home dashboard already
  // current after finishing), plus history/PR/progress/export/privacy for
  // good measure — the canary must not leak from ANY screen.
  await page.locator("[data-nav='sheet']").click(); // history landing
  await expect(page.locator(".wblock")).toContainText(CANARY_EXERCISE);
  await page.locator("[data-nav='prs']").click();
  await page.locator("[data-nav='charts']").click(); // progress landing
  await page.locator("[data-nav='export']").click();
  await expect(page.locator("#exportBox")).toContainText(CANARY_EXERCISE);
  await page.locator("[data-nav='plans']").click(); // plan library

  const leaked = requestSnippets.filter((s) => s.includes(CANARY_EXERCISE) || s.includes(CANARY_NOTE) || s.includes(CANARY_WEIGHT));
  expect(leaked).toEqual([]);
});
