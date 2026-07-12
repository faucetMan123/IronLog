// Explicit, forward-only SQLite schema. Each entry in SCHEMA_MIGRATIONS is
// applied in order and recorded in `schema_migrations`; the app never
// mutates an already-applied migration's SQL in place — a schema change is
// always a new migration appended to this array.

export interface SchemaMigration {
  version: number;
  description: string;
  statements: string[];
}

export const SCHEMA_MIGRATIONS: SchemaMigration[] = [
  {
    version: 1,
    description: "Initial schema: plans/days/exercises, workout history, drafts, settings, backup metadata",
    statements: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );`,

      // Stable exercise identity. displayName may be renamed freely — every
      // other table references exercises by id, never by name.
      `CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        aliases TEXT NOT NULL DEFAULT '[]',
        primary_muscle TEXT,
        secondary_muscles TEXT NOT NULL DEFAULT '[]',
        equipment TEXT,
        movement_category TEXT,
        unilateral INTEGER NOT NULL DEFAULT 0,
        default_weight_increment REAL NOT NULL DEFAULT 2.5,
        is_custom INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS workout_days (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL REFERENCES plans(id),
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS day_exercises (
        id TEXT PRIMARY KEY,
        workout_day_id TEXT NOT NULL REFERENCES workout_days(id),
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        sort_order INTEGER NOT NULL DEFAULT 0,
        target_sets INTEGER,
        min_reps INTEGER,
        max_reps INTEGER,
        rest_seconds INTEGER,
        weight_increment REAL,
        notes TEXT
      );`,

      // Immutable snapshot of a completed session: template_name is
      // duplicated here (not joined live from plans/workout_days) so that
      // renaming or deleting a plan/day later never alters historical
      // display, mirroring the v15 templateName duplication.
      `CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        workout_day_id TEXT,
        template_name TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        notes TEXT,
        source TEXT NOT NULL DEFAULT 'app'
      );`,

      // exercise_name is likewise a point-in-time snapshot string, alongside
      // the stable exercise_id FK — renaming an exercise's displayName must
      // not rewrite what a historical session shows it was called.
      `CREATE TABLE IF NOT EXISTS performed_exercises (
        id TEXT PRIMARY KEY,
        workout_session_id TEXT NOT NULL REFERENCES workout_sessions(id),
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        exercise_name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        notes TEXT
      );`,

      // One row per completed set.
      `CREATE TABLE IF NOT EXISTS performed_sets (
        id TEXT PRIMARY KEY,
        performed_exercise_id TEXT NOT NULL REFERENCES performed_exercises(id),
        set_index INTEGER NOT NULL,
        weight REAL NOT NULL DEFAULT 0,
        reps REAL NOT NULL DEFAULT 0,
        rir REAL,
        completed_at TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS workout_drafts (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        workout_day_id TEXT,
        template_name TEXT,
        started_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );`,

      // Backup/restore bookkeeping AND the migration-completion marker
      // (key = 'v15_migration_completed_at'), kept separate from
      // schema_migrations because it's data-migration state, not DDL state.
      `CREATE TABLE IF NOT EXISTS backup_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );`,

      `CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_at ON workout_sessions(completed_at);`,
      `CREATE INDEX IF NOT EXISTS idx_performed_exercises_session ON performed_exercises(workout_session_id);`,
      `CREATE INDEX IF NOT EXISTS idx_performed_exercises_exercise ON performed_exercises(exercise_id);`,
      `CREATE INDEX IF NOT EXISTS idx_performed_sets_performed_exercise ON performed_sets(performed_exercise_id);`,
      `CREATE INDEX IF NOT EXISTS idx_day_exercises_day ON day_exercises(workout_day_id);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_days_plan ON workout_days(plan_id);`,
    ],
  },
];

export const CURRENT_SCHEMA_VERSION = SCHEMA_MIGRATIONS[SCHEMA_MIGRATIONS.length - 1].version;
