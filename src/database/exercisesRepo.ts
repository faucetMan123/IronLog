// Repository for the `exercises` table (curated library + custom exercises).
import { getDb, persistWebStore } from "./db";
import { slugify } from "../workouts/slug";

export interface ExerciseRecord {
  id: string;
  displayName: string;
  aliases: string[];
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  equipment: string | null;
  movementCategory: string | null;
  unilateral: boolean;
  defaultWeightIncrement: number;
  isCustom: boolean;
}

interface ExerciseRow {
  id: string;
  display_name: string;
  aliases: string;
  primary_muscle: string | null;
  secondary_muscles: string;
  equipment: string | null;
  movement_category: string | null;
  unilateral: number;
  default_weight_increment: number;
  is_custom: number;
}

function rowToExercise(row: ExerciseRow): ExerciseRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    aliases: JSON.parse(row.aliases || "[]"),
    primaryMuscle: row.primary_muscle,
    secondaryMuscles: JSON.parse(row.secondary_muscles || "[]"),
    equipment: row.equipment,
    movementCategory: row.movement_category,
    unilateral: !!row.unilateral,
    defaultWeightIncrement: row.default_weight_increment,
    isCustom: !!row.is_custom,
  };
}

export async function listExercises(): Promise<ExerciseRecord[]> {
  const db = await getDb();
  const res = await db.query("SELECT * FROM exercises ORDER BY is_custom ASC, display_name ASC");
  return ((res.values ?? []) as ExerciseRow[]).map(rowToExercise);
}

export async function getExercise(id: string): Promise<ExerciseRecord | null> {
  const db = await getDb();
  const res = await db.query("SELECT * FROM exercises WHERE id = ?", [id]);
  const row = (res.values ?? [])[0] as ExerciseRow | undefined;
  return row ? rowToExercise(row) : null;
}

/** Case-insensitive search over display name and aliases — mirrors the
 *  alias recognition the spec calls for (RDL -> Romanian Deadlift, etc). */
export async function searchExercises(query: string): Promise<ExerciseRecord[]> {
  const all = await listExercises();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter((e) => e.displayName.toLowerCase().includes(q) || e.aliases.some((a) => a.toLowerCase().includes(q)));
}

/** Creates (or reuses, if the same name already resolved to a custom
 *  exercise before) a custom exercise. Ids are deterministic slugs, not
 *  random UUIDs, matching the same identity rule the v15 migration uses —
 *  but still stable/unique per distinct name, satisfying "UUID or
 *  equivalent stable id". */
export async function createCustomExercise(displayName: string): Promise<ExerciseRecord> {
  const name = displayName.trim();
  if (!name) throw new Error("Exercise name required");
  const id = "custom_" + slugify(name);
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run(
    `INSERT OR IGNORE INTO exercises (id, display_name, aliases, primary_muscle, secondary_muscles, equipment, movement_category, unilateral, default_weight_increment, is_custom, created_at)
     VALUES (?, ?, '[]', NULL, '[]', NULL, NULL, 0, 2.5, 1, ?)`,
    [id, name, now]
  );
  await persistWebStore();
  const created = await getExercise(id);
  if (!created) throw new Error("Failed to create custom exercise");
  return created;
}
