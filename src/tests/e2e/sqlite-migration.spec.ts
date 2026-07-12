import { test, expect } from "@playwright/test";

// Real-browser integration test for the v15 -> SQLite migration (Phase 4).
// jeep-sqlite needs actual IndexedDB + WASM, which jsdom/vitest can't
// provide — Playwright's real Chromium can, so this is the only place the
// migration is verified against a live database rather than the pure
// transform function tested in src/tests/migration/.

const SEED_V15_DATA = {
  templates: [
    { id: "t1", name: "Push Heavy", exercises: [{ id: "e1", name: "Bench Press", sets: 4, reps: "5–8" }] },
    { id: "t2", name: "Pull Heavy", exercises: [{ id: "e6", name: "Pull-Up", sets: 4, reps: "5–8" }] },
  ],
  workouts: [
    {
      id: "w1", templateId: "t1", templateName: "Push Heavy", date: "2026-06-01T12:00:00.000Z",
      entries: [{ exerciseName: "Bench Press", sets: [{ weight: "80", reps: "6" }, { weight: "82.5", reps: "5" }] }],
    },
    {
      id: "w2", templateId: "t2", templateName: "Pull Heavy", date: "2026-06-03T12:00:00.000Z",
      entries: [{ exerciseName: "RDL", sets: [{ weight: "100", reps: "8" }] }], // raw unaliased name on purpose
    },
  ],
  settings: { pullupBodyweight: "" },
  meta: { lastManualBackupAt: "", lastSnapshotAt: "", lastMirrorAt: "", persistentGranted: null, persistentCheckedAt: "", protectionStartedAt: "" },
};

test("v15 data migrates into a real SQLite database on first launch", async ({ page }) => {
  await page.addInitScript((seed) => {
    window.localStorage.setItem("ironlog-v1", JSON.stringify(seed));
  }, SEED_V15_DATA);

  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-migration-status", "completed", { timeout: 15_000 });

  const counts = await page.evaluate(async () => {
    const db = await window.__elSupremoDebug!.getDb();
    const sessions = await db.query("SELECT COUNT(*) as c FROM workout_sessions");
    const sets = await db.query("SELECT COUNT(*) as c FROM performed_sets");
    const marker = await db.query("SELECT value FROM backup_metadata WHERE key = 'v15_migration_completed_at'");
    const rdl = await db.query("SELECT exercise_id FROM performed_exercises WHERE exercise_name = 'Romanian Deadlift'");
    return {
      sessions: (sessions.values?.[0] as { c: number }).c,
      sets: (sets.values?.[0] as { c: number }).c,
      hasMarker: (marker.values?.length ?? 0) > 0,
      rdlExerciseId: (rdl.values?.[0] as { exercise_id: string } | undefined)?.exercise_id,
    };
  });

  expect(counts.sessions).toBe(2);
  expect(counts.sets).toBe(3); // 2 bench sets + 1 RDL set
  expect(counts.hasMarker).toBe(true);
  expect(counts.rdlExerciseId).toBe("romanian_deadlift"); // raw "RDL" resolved via the alias table into the library id
});

test("migration is idempotent across a reload — no duplicate rows", async ({ page }) => {
  await page.addInitScript((seed) => {
    window.localStorage.setItem("ironlog-v1", JSON.stringify(seed));
  }, SEED_V15_DATA);

  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-migration-status", "completed", { timeout: 15_000 });

  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-migration-status", "skipped", { timeout: 15_000 });

  const sessionCount = await page.evaluate(async () => {
    const db = await window.__elSupremoDebug!.getDb();
    const res = await db.query("SELECT COUNT(*) as c FROM workout_sessions");
    return (res.values?.[0] as { c: number }).c;
  });
  expect(sessionCount).toBe(2);
});

test("a fresh install with no legacy data completes migration as a no-op", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-migration-status", "completed", { timeout: 15_000 });

  const sessionCount = await page.evaluate(async () => {
    const db = await window.__elSupremoDebug!.getDb();
    const res = await db.query("SELECT COUNT(*) as c FROM workout_sessions");
    return (res.values?.[0] as { c: number }).c;
  });
  expect(sessionCount).toBe(0);
});
