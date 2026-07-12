// Orchestrates the one-time v15 -> SQLite migration on app startup.
// Non-destructive: never touches localStorage/IndexedDB legacy data, only
// writes into the new SQLite database. Idempotent via the
// backup_metadata.v15_migration_completed_at marker, checked before doing
// any work.
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { getDb, insertOrIgnore, getSetting, setSetting, persistWebStore } from "../database/db";
import { migrateV15Data, validateMigration, type MigratedRows } from "./v15ToSqlite";
import { latestProtectedCopy, loadLegacy, normalizeData } from "../database/legacyStorage";
import type { AppData } from "../app/types";

const MIGRATION_MARKER_KEY = "v15_migration_completed_at";
const PRE_MIGRATION_BACKUP_KEY = "pre_migration_backup_json";

async function pickBestLegacySource(): Promise<AppData> {
  const primary = loadLegacy();
  const protectedCopy = await latestProtectedCopy();
  if (protectedCopy && protectedCopy.data.workouts.length > primary.workouts.length) {
    return normalizeData(protectedCopy.data);
  }
  return primary;
}

const TABLE_COLUMNS: Record<keyof MigratedRows, string[]> = {
  exercises: ["id", "display_name", "aliases", "primary_muscle", "secondary_muscles", "equipment", "movement_category", "unilateral", "default_weight_increment", "is_custom", "created_at"],
  plans: ["id", "name", "archived", "sort_order", "created_at", "updated_at"],
  workoutDays: ["id", "plan_id", "name", "sort_order", "created_at", "updated_at"],
  dayExercises: ["id", "workout_day_id", "exercise_id", "sort_order", "target_sets", "min_reps", "max_reps", "rest_seconds", "weight_increment", "notes"],
  workoutSessions: ["id", "plan_id", "workout_day_id", "template_name", "started_at", "completed_at", "notes", "source"],
  performedExercises: ["id", "workout_session_id", "exercise_id", "exercise_name", "sort_order", "notes"],
  performedSets: ["id", "performed_exercise_id", "set_index", "weight", "reps", "rir", "completed_at"],
  appSettings: ["key", "value"],
};

const TABLE_NAMES: Record<keyof MigratedRows, string> = {
  exercises: "exercises",
  plans: "plans",
  workoutDays: "workout_days",
  dayExercises: "day_exercises",
  workoutSessions: "workout_sessions",
  performedExercises: "performed_exercises",
  performedSets: "performed_sets",
  appSettings: "app_settings",
};

async function insertAllRows(db: SQLiteDBConnection, rows: MigratedRows): Promise<void> {
  // Order matters for FK integrity: exercises/plans before day/exercise
  // joins, sessions before their performed rows.
  const order: (keyof MigratedRows)[] = ["exercises", "plans", "workoutDays", "dayExercises", "workoutSessions", "performedExercises", "performedSets", "appSettings"];
  for (const key of order) {
    await insertOrIgnore(db, { table: TABLE_NAMES[key], columns: TABLE_COLUMNS[key], rows: rows[key] as unknown as Record<string, unknown>[] });
  }
}

export interface MigrationOutcome {
  status: "skipped" | "completed" | "failed";
  issues: string[];
  sessionsMigrated: number;
  seededDefaultProgramme: boolean;
}

/** @param hasLegacyEvidence - store.ts's `hasLegacyEvidence()`, resolved
 *  from a read captured BEFORE this session's own startup writes. Must be
 *  passed in already-resolved rather than recomputed here: by the time
 *  this function runs, initDataProtection() has already called
 *  persistMirror(), which writes both localStorage["ironlog-v1"] and a
 *  fresh IndexedDB mirror record as side effects — a live check at this
 *  point would always see those writes and incorrectly report "returning
 *  user" for every fresh install, silently seeding a default programme and
 *  skipping first-launch onboarding for new users. */
export async function runV15Migration(hasLegacyEvidence: boolean): Promise<MigrationOutcome> {
  const db = await getDb();

  const already = await getSetting(db, "backup_metadata", MIGRATION_MARKER_KEY);
  if (already) {
    return { status: "skipped", issues: [], sessionsMigrated: 0, seededDefaultProgramme: false };
  }

  const source = await pickBestLegacySource();
  const seedDefaultProgramme = hasLegacyEvidence || source.workouts.length > 0;

  // Pre-migration backup, written before any row is inserted.
  await setSetting(db, "backup_metadata", PRE_MIGRATION_BACKUP_KEY, JSON.stringify(source));
  await persistWebStore();

  const rows = migrateV15Data(source, new Date().toISOString(), { seedDefaultProgramme });
  const validation = validateMigration(source, rows);

  await insertAllRows(db, rows);

  if (!validation.ok) {
    await persistWebStore();
    return { status: "failed", issues: validation.issues, sessionsMigrated: 0, seededDefaultProgramme: false };
  }

  await setSetting(db, "backup_metadata", MIGRATION_MARKER_KEY, new Date().toISOString());
  await persistWebStore();

  return { status: "completed", issues: [], sessionsMigrated: rows.workoutSessions.length, seededDefaultProgramme: seedDefaultProgramme };
}
