// Pure, side-effect-free transform: v15 AppData -> new-schema row sets.
// Kept free of any actual SQLite/Capacitor dependency so it can be unit
// tested exhaustively without a live database connection (see
// src/tests/migration/). src/database/db.ts is responsible for actually
// inserting these rows.
import type { AppData, Template, Workout } from "../app/types";
import { EXERCISE_LIBRARY, resolveLibraryId, type ExerciseLibraryEntry } from "../database/exerciseLibrary";
import { standardizeExerciseName } from "../workouts/aliases";
import { slugify } from "../workouts/slug";
import { toNum } from "../app/format";

export interface ExerciseRow {
  id: string;
  display_name: string;
  aliases: string; // JSON array
  primary_muscle: string | null;
  secondary_muscles: string; // JSON array
  equipment: string | null;
  movement_category: string | null;
  unilateral: 0 | 1;
  default_weight_increment: number;
  is_custom: 0 | 1;
  created_at: string;
}

export interface PlanRow {
  id: string;
  name: string;
  archived: 0 | 1;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkoutDayRow {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DayExerciseRow {
  id: string;
  workout_day_id: string;
  exercise_id: string;
  sort_order: number;
  target_sets: number | null;
  min_reps: number | null;
  max_reps: number | null;
  rest_seconds: number | null;
  weight_increment: number | null;
  notes: string | null;
}

export interface WorkoutSessionRow {
  id: string;
  plan_id: string | null;
  workout_day_id: string | null;
  template_name: string;
  started_at: string;
  completed_at: string;
  notes: string | null;
  source: string;
}

export interface PerformedExerciseRow {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  exercise_name: string;
  sort_order: number;
  notes: string | null;
}

export interface PerformedSetRow {
  id: string;
  performed_exercise_id: string;
  set_index: number;
  weight: number;
  reps: number;
  rir: number | null;
  completed_at: string | null;
}

export interface AppSettingRow {
  key: string;
  value: string;
}

export interface MigratedRows {
  exercises: ExerciseRow[];
  plans: PlanRow[];
  workoutDays: WorkoutDayRow[];
  dayExercises: DayExerciseRow[];
  workoutSessions: WorkoutSessionRow[];
  performedExercises: PerformedExerciseRow[];
  performedSets: PerformedSetRow[];
  appSettings: AppSettingRow[];
}

export const MIGRATED_PLAN_ID = "plan_legacy_programme";

function customExerciseId(canonicalName: string): string {
  return "custom_" + slugify(canonicalName);
}

/** Resolves a raw (possibly unaliased) v15 exercise name to a stable id,
 *  creating a deterministic custom-exercise entry if it isn't in the
 *  curated library. Same input always produces the same id/row — this is
 *  what makes exercise resolution idempotent across repeated migration
 *  runs without needing a persisted lookup table. */
function resolveExercise(rawName: string, customExercises: Map<string, ExerciseRow>, now: string): string {
  const canonical = standardizeExerciseName(rawName);
  const libraryId = resolveLibraryId(canonical);
  if (libraryId) return libraryId;

  const id = customExerciseId(canonical);
  if (!customExercises.has(id)) {
    customExercises.set(id, {
      id,
      display_name: canonical,
      aliases: "[]",
      primary_muscle: null,
      secondary_muscles: "[]",
      equipment: null,
      movement_category: null,
      unilateral: 0,
      default_weight_increment: 2.5,
      is_custom: 1,
      created_at: now,
    });
  }
  return id;
}

function libraryRow(entry: ExerciseLibraryEntry, now: string): ExerciseRow {
  return {
    id: entry.id,
    display_name: entry.displayName,
    aliases: JSON.stringify(entry.aliases),
    primary_muscle: entry.primaryMuscle,
    secondary_muscles: JSON.stringify(entry.secondaryMuscles),
    equipment: entry.equipment,
    movement_category: entry.movementCategory,
    unilateral: entry.unilateral ? 1 : 0,
    default_weight_increment: entry.defaultWeightIncrement,
    is_custom: 0,
    created_at: now,
  };
}

function migrateTemplate(t: Template, sortOrder: number, customExercises: Map<string, ExerciseRow>, now: string) {
  const dayId = "day_" + t.id;
  const day: WorkoutDayRow = {
    id: dayId,
    plan_id: MIGRATED_PLAN_ID,
    name: t.name,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  };
  const dayExercises: DayExerciseRow[] = t.exercises.map((ex, i) => {
    const exerciseId = resolveExercise(ex.name, customExercises, now);
    const sets = typeof ex.sets === "number" ? ex.sets : parseInt(String(ex.sets)) || null;
    const repMatch = /^(\d+)\s*[–—-]\s*(\d+)$/.exec(String(ex.reps ?? "").trim());
    return {
      id: `dayex_${t.id}_${ex.id}`,
      workout_day_id: dayId,
      exercise_id: exerciseId,
      sort_order: i,
      target_sets: sets,
      min_reps: repMatch ? parseInt(repMatch[1]) : null,
      max_reps: repMatch ? parseInt(repMatch[2]) : null,
      rest_seconds: null,
      weight_increment: null,
      notes: null,
    };
  });
  return { day, dayExercises };
}

function migrateWorkout(w: Workout, customExercises: Map<string, ExerciseRow>): {
  session: WorkoutSessionRow;
  performedExercises: PerformedExerciseRow[];
  performedSets: PerformedSetRow[];
} {
  const session: WorkoutSessionRow = {
    id: w.id,
    plan_id: MIGRATED_PLAN_ID,
    workout_day_id: "day_" + w.templateId,
    template_name: w.templateName,
    started_at: w.date,
    completed_at: w.date,
    notes: null,
    source: "v15_migration",
  };
  const performedExercises: PerformedExerciseRow[] = [];
  const performedSets: PerformedSetRow[] = [];
  w.entries.forEach((entry, ei) => {
    const canonicalName = standardizeExerciseName(entry.exerciseName);
    const exerciseId = resolveExercise(entry.exerciseName, customExercises, w.date);
    const peId = `pe_${w.id}_${ei}`;
    performedExercises.push({
      id: peId,
      workout_session_id: w.id,
      exercise_id: exerciseId,
      exercise_name: canonicalName,
      sort_order: ei,
      notes: null,
    });
    entry.sets.forEach((s, si) => {
      // Mirrors finishSession()'s filter in v15: a set only survives if it has a weight or reps value.
      if (String(s.weight).trim() === "" && String(s.reps).trim() === "") return;
      performedSets.push({
        id: `ps_${w.id}_${ei}_${si}`,
        performed_exercise_id: peId,
        set_index: si,
        weight: toNum(s.weight),
        reps: toNum(s.reps),
        rir: null,
        completed_at: w.date,
      });
    });
  });
  return { session, performedExercises, performedSets };
}

export interface MigrateOptions {
  /** False for a genuinely fresh install with no prior v15 usage evidence at
   *  all (see runMigration.ts) — in that case we must NOT silently create
   *  the "My Programme" plan + 6 default workout_days, or first-launch
   *  onboarding would never trigger for new (especially Android) users.
   *  Defaults to true: a returning v15 user always keeps their templates. */
  seedDefaultProgramme?: boolean;
}

export function migrateV15Data(data: AppData, now: string = new Date().toISOString(), options: MigrateOptions = {}): MigratedRows {
  const seedProgramme = options.seedDefaultProgramme !== false;
  const customExercises = new Map<string, ExerciseRow>();

  const plans: PlanRow[] = [];
  const workoutDays: WorkoutDayRow[] = [];
  const dayExercises: DayExerciseRow[] = [];
  if (seedProgramme) {
    plans.push({
      id: MIGRATED_PLAN_ID,
      name: "My Programme",
      archived: 0,
      sort_order: 0,
      created_at: now,
      updated_at: now,
    });
    data.templates.forEach((t, i) => {
      const { day, dayExercises: dex } = migrateTemplate(t, i, customExercises, now);
      workoutDays.push(day);
      dayExercises.push(...dex);
    });
  }

  const workoutSessions: WorkoutSessionRow[] = [];
  const performedExercises: PerformedExerciseRow[] = [];
  const performedSets: PerformedSetRow[] = [];
  data.workouts.forEach((w) => {
    const { session, performedExercises: pe, performedSets: ps } = migrateWorkout(w, customExercises);
    workoutSessions.push(session);
    performedExercises.push(...pe);
    performedSets.push(...ps);
  });

  const exercises: ExerciseRow[] = [...EXERCISE_LIBRARY.map((e) => libraryRow(e, now)), ...customExercises.values()];

  const appSettings: AppSettingRow[] = [{ key: "pullup_bodyweight", value: data.settings.pullupBodyweight ?? "" }];

  return { exercises, plans, workoutDays, dayExercises, workoutSessions, performedExercises, performedSets, appSettings };
}

export interface MigrationValidation {
  ok: boolean;
  issues: string[];
  counts: {
    sourceWorkouts: number;
    migratedSessions: number;
    sourceNonEmptySets: number;
    migratedSets: number;
  };
}

/** Counts-and-values check described in docs/MIGRATION_V15.md §6 step 6. */
export function validateMigration(source: AppData, rows: MigratedRows): MigrationValidation {
  const issues: string[] = [];

  const sourceNonEmptySets = source.workouts.reduce(
    (sum, w) => sum + w.entries.reduce((a, e) => a + e.sets.filter((s) => String(s.weight).trim() !== "" || String(s.reps).trim() !== "").length, 0),
    0
  );

  if (rows.workoutSessions.length !== source.workouts.length) {
    issues.push(`session count mismatch: source=${source.workouts.length} migrated=${rows.workoutSessions.length}`);
  }
  if (rows.performedSets.length !== sourceNonEmptySets) {
    issues.push(`set count mismatch: source=${sourceNonEmptySets} migrated=${rows.performedSets.length}`);
  }

  const sessionIds = new Set(rows.workoutSessions.map((s) => s.id));
  for (const w of source.workouts) {
    if (!sessionIds.has(w.id)) issues.push(`missing session for source workout id ${w.id}`);
  }

  const exerciseIds = new Set(rows.exercises.map((e) => e.id));
  for (const pe of rows.performedExercises) {
    if (!exerciseIds.has(pe.exercise_id)) issues.push(`performed_exercise ${pe.id} references unknown exercise_id ${pe.exercise_id}`);
  }

  return {
    ok: issues.length === 0,
    issues,
    counts: {
      sourceWorkouts: source.workouts.length,
      migratedSessions: rows.workoutSessions.length,
      sourceNonEmptySets,
      migratedSets: rows.performedSets.length,
    },
  };
}
