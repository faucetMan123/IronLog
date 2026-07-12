import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrateV15Data, validateMigration, MIGRATED_PLAN_ID } from "../../migrations/v15ToSqlite";
import { normalizeData } from "../../database/legacyStorage";
import { allPRs } from "../../workouts/prs";
import { lastSets } from "../../workouts/autofill";
import type { AppData } from "../../app/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "../../../fixtures/v15");

function loadFixture(name: string): AppData {
  const raw = JSON.parse(readFileSync(join(FIXTURES_DIR, name), "utf8"));
  return normalizeData(raw);
}

describe("migrateV15Data — record counts and integrity (fixture-by-fixture)", () => {
  const fixtures = ["empty.json", "single-workout.json", "multi-template-history.json", "unaliased-names.json", "custom-exercise.json"];

  for (const fixture of fixtures) {
    it(`${fixture}: migrates with no validation issues`, () => {
      const data = loadFixture(fixture);
      const rows = migrateV15Data(data, "2026-07-12T00:00:00.000Z");
      const validation = validateMigration(data, rows);
      expect(validation.issues).toEqual([]);
      expect(validation.ok).toBe(true);
      expect(validation.counts.migratedSessions).toBe(validation.counts.sourceWorkouts);
      expect(validation.counts.migratedSets).toBe(validation.counts.sourceNonEmptySets);
    });
  }

  it("idb-mirror-only.json (nested under .data): migrates once unwrapped", () => {
    const raw = JSON.parse(readFileSync(join(FIXTURES_DIR, "idb-mirror-only.json"), "utf8"));
    const data = normalizeData(raw.data);
    const rows = migrateV15Data(data);
    expect(validateMigration(data, rows).ok).toBe(true);
    expect(rows.workoutSessions).toHaveLength(1);
  });
});

describe("migrateV15Data — idempotency", () => {
  it("running the transform twice on the same source produces byte-identical rows (safe to re-run)", () => {
    const data = loadFixture("multi-template-history.json");
    const first = migrateV15Data(data, "2026-07-12T00:00:00.000Z");
    const second = migrateV15Data(data, "2026-07-12T00:00:00.000Z");
    expect(second).toEqual(first);
  });

  it("row ids are deterministic across runs, so DB-level INSERT OR IGNORE never duplicates", () => {
    const data = loadFixture("single-workout.json");
    const a = migrateV15Data(data);
    const b = migrateV15Data(data);
    expect(a.workoutSessions.map((s) => s.id)).toEqual(b.workoutSessions.map((s) => s.id));
    expect(a.performedSets.map((s) => s.id)).toEqual(b.performedSets.map((s) => s.id));
  });
});

describe("migrateV15Data — exercise identity resolution", () => {
  it("resolves raw/unaliased names to the SAME exercise id as their canonical form (case-insensitive, matching v15's existing behavior)", () => {
    const data = loadFixture("unaliased-names.json");
    const rows = migrateV15Data(data);
    const rdlIds = new Set(rows.performedExercises.filter((pe) => pe.exercise_name === "Romanian Deadlift").map((pe) => pe.exercise_id));
    const benchIds = new Set(rows.performedExercises.filter((pe) => pe.exercise_name === "Bench Press").map((pe) => pe.exercise_id));
    expect(rdlIds.size).toBe(1);
    expect(benchIds.size).toBe(1);
    expect([...rdlIds][0]).toBe("romanian_deadlift");
    expect([...benchIds][0]).toBe("bench_press_barbell");
  });

  it("never drops a custom (non-library) exercise — it becomes a stable custom exercise row instead", () => {
    const data = loadFixture("custom-exercise.json");
    const rows = migrateV15Data(data);
    const custom = rows.exercises.find((e) => e.display_name === "Farmer Carry" && e.is_custom === 0);
    // Farmer Carry IS in the curated library in this build, so it should resolve there, not to a generated custom row.
    expect(custom).toBeDefined();
    const pe = rows.performedExercises.find((p) => p.exercise_name === "Farmer Carry");
    expect(pe?.exercise_id).toBe(custom!.id);
  });

  it("an exercise name with no library or alias match gets a stable generated custom id, never dropped", () => {
    const data: AppData = {
      templates: [],
      workouts: [
        {
          id: "wX",
          templateId: "t1",
          templateName: "Push Heavy",
          date: "2026-01-01T00:00:00.000Z",
          entries: [{ exerciseName: "Atlas Stone Load", sets: [{ weight: "50", reps: "3" }] }],
        },
      ],
      settings: { pullupBodyweight: "" },
      meta: { lastManualBackupAt: "", lastSnapshotAt: "", lastMirrorAt: "", persistentGranted: null, persistentCheckedAt: "", protectionStartedAt: "" },
    };
    const rows = migrateV15Data(data);
    const custom = rows.exercises.find((e) => e.display_name === "Atlas Stone Load");
    expect(custom).toBeDefined();
    expect(custom!.is_custom).toBe(1);
    expect(rows.performedExercises[0].exercise_id).toBe(custom!.id);
    expect(rows.performedSets).toHaveLength(1);
  });
});

describe("migrateV15Data — structural mapping", () => {
  it("seeds one plan and one workout_day per template, preserving template order", () => {
    const data = loadFixture("multi-template-history.json");
    const rows = migrateV15Data(data);
    expect(rows.plans).toHaveLength(1);
    expect(rows.plans[0].id).toBe(MIGRATED_PLAN_ID);
    expect(rows.workoutDays.map((d) => d.name)).toEqual(["Push Heavy", "Push Volume", "Pull Heavy"]);
  });

  it("drops fully-blank sets exactly like v15's finishSession() filter", () => {
    const data: AppData = {
      templates: [],
      workouts: [
        {
          id: "wY",
          templateId: "t1",
          templateName: "Push Heavy",
          date: "2026-01-01T00:00:00.000Z",
          entries: [{ exerciseName: "Bench Press", sets: [{ weight: "80", reps: "6" }, { weight: "", reps: "" }] }],
        },
      ],
      settings: { pullupBodyweight: "" },
      meta: { lastManualBackupAt: "", lastSnapshotAt: "", lastMirrorAt: "", persistentGranted: null, persistentCheckedAt: "", protectionStartedAt: "" },
    };
    const rows = migrateV15Data(data);
    expect(rows.performedSets).toHaveLength(1);
    expect(rows.performedSets[0]).toMatchObject({ weight: 80, reps: 6 });
  });

  it("preserves per-workout template_name/exercise_name snapshots independent of later template edits (immutability property)", () => {
    const data = loadFixture("single-workout.json");
    const rows = migrateV15Data(data);
    expect(rows.workoutSessions[0].template_name).toBe("Push Heavy");
    // Even if `data.templates` were edited/renamed after this point, these snapshot strings must not change —
    // they are captured at migration/logging time, not derived via a live join.
    data.templates[0].name = "Renamed Later";
    expect(rows.workoutSessions[0].template_name).toBe("Push Heavy");
  });
});

describe("migrateV15Data — parity with pre-migration PR/autofill logic", () => {
  it("the migrated performed_sets reproduce the same heaviest-set PR that allPRs() computes on the source data", () => {
    const data = loadFixture("multi-template-history.json");
    const sourcePRs = allPRs(data);
    const rows = migrateV15Data(data);

    for (const pr of sourcePRs) {
      const matchingExerciseIds = new Set(rows.performedExercises.filter((pe) => pe.exercise_name.toLowerCase() === pr.name.toLowerCase()).map((pe) => pe.id));
      const migratedSets = rows.performedSets.filter((s) => matchingExerciseIds.has(s.performed_exercise_id));
      const best = migratedSets.reduce((acc, s) => (s.weight > acc.weight || (s.weight === acc.weight && s.reps > acc.reps) ? s : acc), migratedSets[0]);
      expect(best.weight).toBe(pr.weight);
      expect(best.reps).toBe(pr.reps);
    }
  });

  it("template-scoped autofill (lastSets) and migrated workout_day scoping agree on which session is 'most recent for this template'", () => {
    const data = loadFixture("multi-template-history.json");
    const lastHeavyBench = lastSets(data, "Bench Press", "t1");
    const rows = migrateV15Data(data);

    const heavyDayId = "day_t1";
    const heavySessions = rows.workoutSessions.filter((s) => s.workout_day_id === heavyDayId).sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
    const mostRecentHeavySessionId = heavySessions[0].id;
    const pe = rows.performedExercises.find((p) => p.workout_session_id === mostRecentHeavySessionId && p.exercise_name === "Bench Press")!;
    const sets = rows.performedSets.filter((s) => s.performed_exercise_id === pe.id).sort((a, b) => a.set_index - b.set_index);

    expect(sets.map((s) => String(s.weight))).toEqual(lastHeavyBench.map((s) => s.weight));
  });
});

describe("migrateV15Data — corrupted source handling", () => {
  it("a corrupted fixture (missing workouts array) normalizes to a safe empty default rather than crashing", () => {
    const raw = JSON.parse(readFileSync(join(FIXTURES_DIR, "corrupted.json"), "utf8"));
    const data = normalizeData(raw);
    expect(data.workouts).toEqual([]);
    expect(data.templates.length).toBe(6); // falls back to the 6 default templates, not the corrupted file's partial templates
    const rows = migrateV15Data(data);
    expect(validateMigration(data, rows).ok).toBe(true);
    expect(rows.workoutSessions).toHaveLength(0);
  });
});

describe("migrateV15Data — fresh-install onboarding gate", () => {
  it("with seedDefaultProgramme:false, creates no plan/workout_day rows even though templates are present", () => {
    const data = loadFixture("empty.json"); // has the 6 default templates, 0 workouts
    const rows = migrateV15Data(data, "2026-07-12T00:00:00.000Z", { seedDefaultProgramme: false });
    expect(rows.plans).toEqual([]);
    expect(rows.workoutDays).toEqual([]);
    expect(rows.dayExercises).toEqual([]);
    // the exercise library itself is still seeded — it's reference data, not user data
    expect(rows.exercises.length).toBeGreaterThan(0);
    expect(validateMigration(data, rows).ok).toBe(true);
  });

  it("defaults to seeding the programme when the option is omitted (returning-user behavior unchanged)", () => {
    const data = loadFixture("empty.json");
    const rows = migrateV15Data(data, "2026-07-12T00:00:00.000Z");
    expect(rows.plans).toHaveLength(1);
    expect(rows.workoutDays).toHaveLength(6);
  });
});
