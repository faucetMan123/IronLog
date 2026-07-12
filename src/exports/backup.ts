// Schema-versioned JSON backup format, plus import of both this format and
// legacy v15-style backup files (reusing the exact same tested transform
// Phase 4's migration uses — "migration of older backups").
import { getDb, insertOrIgnore, persistWebStore } from "../database/db";
import { migrateV15Data, validateMigration } from "../migrations/v15ToSqlite";
import { normalizeData } from "../database/legacyStorage";
import type { AppData } from "../app/types";
import { CURRENT_SCHEMA_VERSION } from "../database/schema";

export const APP_VERSION = "16.0.0";

const EXPORT_TABLES = ["exercises", "plans", "workout_days", "day_exercises", "workout_sessions", "performed_exercises", "performed_sets", "app_settings"] as const;
type ExportTable = (typeof EXPORT_TABLES)[number];

export interface BackupFile {
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  checksum: string;
  counts: Record<ExportTable, number>;
  data: Record<ExportTable, Record<string, unknown>[]>;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildBackup(): Promise<BackupFile> {
  const db = await getDb();
  const data = {} as Record<ExportTable, Record<string, unknown>[]>;
  const counts = {} as Record<ExportTable, number>;
  for (const table of EXPORT_TABLES) {
    const res = await db.query(`SELECT * FROM ${table}`);
    data[table] = (res.values ?? []) as Record<string, unknown>[];
    counts[table] = data[table].length;
  }
  const checksum = await sha256Hex(JSON.stringify(data));
  return { schemaVersion: CURRENT_SCHEMA_VERSION, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), checksum, counts, data };
}

export interface ImportPreview {
  kind: "current" | "legacy_v15";
  counts: Record<string, number>;
  issues: string[];
  apply: (mode: "merge" | "replace") => Promise<void>;
}

function looksLikeCurrentFormat(json: unknown): json is BackupFile {
  const j = json as Partial<BackupFile>;
  return !!j && typeof j.schemaVersion === "number" && typeof j.data === "object" && j.data !== null;
}

function looksLikeLegacyV15(json: unknown): json is Partial<AppData> {
  const j = json as Partial<AppData>;
  return !!j && Array.isArray(j.templates) && Array.isArray(j.workouts);
}

async function applyCurrentFormatRows(data: Record<ExportTable, Record<string, unknown>[]>, mode: "merge" | "replace"): Promise<void> {
  const db = await getDb();
  if (mode === "replace") {
    for (const table of [...EXPORT_TABLES].reverse()) {
      if (table === "exercises") continue; // library rows are reference data; custom ones are re-inserted below via OR IGNORE
      await db.run(`DELETE FROM ${table}`);
    }
  }
  for (const table of EXPORT_TABLES) {
    const rows = data[table] ?? [];
    const columns = rows.length ? Object.keys(rows[0]) : [];
    if (!columns.length) continue;
    await insertOrIgnore(db, { table, columns, rows });
  }
  await persistWebStore();
}

/** Reads and validates a backup file, WITHOUT writing anything — the
 *  caller shows the preview (counts, format) and asks merge/replace before
 *  calling preview.apply(). Corrupted/unrecognized files reject here. */
export async function readBackupFile(fileText: string): Promise<ImportPreview> {
  let json: unknown;
  try {
    json = JSON.parse(fileText);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  if (looksLikeCurrentFormat(json)) {
    const backup = json;
    const recomputed = await sha256Hex(JSON.stringify(backup.data));
    if (backup.checksum && recomputed !== backup.checksum) {
      throw new Error("This backup file's checksum doesn't match its contents — it may be corrupted.");
    }
    const counts: Record<string, number> = {};
    for (const table of EXPORT_TABLES) counts[table] = (backup.data[table] ?? []).length;
    return {
      kind: "current",
      counts,
      issues: [],
      apply: (mode) => applyCurrentFormatRows(backup.data, mode),
    };
  }

  if (looksLikeLegacyV15(json)) {
    const legacyData = normalizeData(json);
    const rows = migrateV15Data(legacyData);
    const validation = validateMigration(legacyData, rows);
    const asExportShape: Record<ExportTable, Record<string, unknown>[]> = {
      exercises: rows.exercises as unknown as Record<string, unknown>[],
      plans: rows.plans as unknown as Record<string, unknown>[],
      workout_days: rows.workoutDays as unknown as Record<string, unknown>[],
      day_exercises: rows.dayExercises as unknown as Record<string, unknown>[],
      workout_sessions: rows.workoutSessions as unknown as Record<string, unknown>[],
      performed_exercises: rows.performedExercises as unknown as Record<string, unknown>[],
      performed_sets: rows.performedSets as unknown as Record<string, unknown>[],
      app_settings: rows.appSettings as unknown as Record<string, unknown>[],
    };
    return {
      kind: "legacy_v15",
      counts: { workouts: legacyData.workouts.length, sets: rows.performedSets.length },
      issues: validation.issues,
      apply: (mode) => applyCurrentFormatRows(asExportShape, mode),
    };
  }

  throw new Error("That file isn't a recognized El Supremo backup.");
}
