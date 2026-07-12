import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

// Backup export/restore round-trip and corrupted-backup rejection —
// exercised against the real built app (downloads a real file via the UI,
// re-uploads it, and inspects the real SQLite database), not mocked.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-migration-status", "completed", { timeout: 15_000 });
});

async function logOneWorkout(page: import("@playwright/test").Page): Promise<void> {
  await page.locator("#starterBtn").click();
  await page.locator(".progress-option").filter({ hasText: "Full Body (3x/week)" }).click();
  await page.getByRole("button", { name: /Start Workout/i }).click();
  await page.locator(".tplcard").first().click();
  const row = page.locator(".setrow").nth(1);
  await row.locator("input[type=number]").nth(0).fill("70");
  await row.locator("input[type=number]").nth(1).fill("8");
  await page.getByRole("button", { name: /Finish Workout/i }).click();
  await page.getByRole("button", { name: /^Finish$/ }).click();
}

test("backup export and restore (replace) produce equivalent data", async ({ page }) => {
  await logOneWorkout(page);

  const countsBefore = await page.evaluate(async () => {
    const db = await window.__elSupremoDebug!.getDb();
    const sessions = await db.query("SELECT COUNT(*) as c FROM workout_sessions");
    const sets = await db.query("SELECT COUNT(*) as c FROM performed_sets");
    return { sessions: (sessions.values?.[0] as { c: number }).c, sets: (sets.values?.[0] as { c: number }).c };
  });
  expect(countsBefore.sessions).toBe(1);

  await page.locator("[data-nav='export']").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#downloadBackupBtn").click();
  const download = await downloadPromise;
  const backupPath = join(os.tmpdir(), `el-supremo-test-backup-${Date.now()}.json`);
  await download.saveAs(backupPath);

  const backupJson = JSON.parse(readFileSync(backupPath, "utf8"));
  expect(backupJson.schemaVersion).toBeGreaterThanOrEqual(1);
  expect(backupJson.checksum).toBeTruthy();
  expect(backupJson.counts.workout_sessions).toBe(1);

  // Erase current data, then restore from the downloaded file (Replace) —
  // the restored state must match what was backed up.
  await page.locator("#privacyBtn").click();
  await page.locator("#eraseBtn").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator("#modalInput").fill("DELETE");
  await page.locator("[data-modal-submit]").click();
  await expect(page.locator("#headerTitle")).toHaveText("Welcome");

  await page.locator("#importBtn").click();
  await page.locator("#importInput").setInputFiles(backupPath);
  await page.locator("[data-modal-close='replace']").click();
  await expect(page.locator("#headerTitle")).toHaveText("El Supremo");

  const countsAfter = await page.evaluate(async () => {
    const db = await window.__elSupremoDebug!.getDb();
    const sessions = await db.query("SELECT COUNT(*) as c FROM workout_sessions");
    const sets = await db.query("SELECT COUNT(*) as c FROM performed_sets");
    return { sessions: (sessions.values?.[0] as { c: number }).c, sets: (sets.values?.[0] as { c: number }).c };
  });
  expect(countsAfter).toEqual(countsBefore);
});

test("restoring the same backup twice (merge) does not duplicate records", async ({ page }) => {
  await logOneWorkout(page);
  await page.locator("[data-nav='export']").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#downloadBackupBtn").click();
  const download = await downloadPromise;
  const backupPath = join(os.tmpdir(), `el-supremo-test-backup-merge-${Date.now()}.json`);
  await download.saveAs(backupPath);

  for (let i = 0; i < 2; i++) {
    await page.locator("#restoreInput").setInputFiles(backupPath);
    await page.getByRole("button", { name: "Merge" }).click();
    await expect(page.locator("#toast")).toContainText("merged");
  }

  const sessionCount = await page.evaluate(async () => {
    const db = await window.__elSupremoDebug!.getDb();
    const res = await db.query("SELECT COUNT(*) as c FROM workout_sessions");
    return (res.values?.[0] as { c: number }).c;
  });
  expect(sessionCount).toBe(1); // same deterministic ids -> INSERT OR IGNORE, no duplicates
});

test("a corrupted backup file is rejected and does not change any data", async ({ page }) => {
  await logOneWorkout(page);

  const tamperedPath = join(os.tmpdir(), `el-supremo-corrupted-${Date.now()}.json`);
  writeFileSync(tamperedPath, JSON.stringify({ schemaVersion: 1, checksum: "not-a-real-checksum", data: { workout_sessions: [{ id: "fake" }] } }));

  await page.locator("[data-nav='export']").click();
  await page.locator("#restoreInput").setInputFiles(tamperedPath);
  await expect(page.locator("#toast")).toContainText("checksum");

  const sessionCount = await page.evaluate(async () => {
    const db = await window.__elSupremoDebug!.getDb();
    const res = await db.query("SELECT COUNT(*) as c FROM workout_sessions");
    return (res.values?.[0] as { c: number }).c;
  });
  expect(sessionCount).toBe(1); // unchanged — the corrupted file must not have been applied

  const garbagePath = join(os.tmpdir(), `el-supremo-garbage-${Date.now()}.json`);
  writeFileSync(garbagePath, "{ this is not valid JSON");
  await page.locator("#restoreInput").setInputFiles(garbagePath);
  await expect(page.locator("#toast")).toContainText("valid");
});
