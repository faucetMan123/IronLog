// Repository for `plans` / `workout_days` / `day_exercises`. Deleting or
// archiving anything here NEVER touches workout_sessions/
// performed_exercises/performed_sets — there is no cascading delete
// defined from plans onto history, by construction (see docs/DATA_MODEL.md).
import { getDb, persistWebStore } from "./db";
import { uid } from "../app/format";
import { getExercise, type ExerciseRecord } from "./exercisesRepo";

export interface PlanRecord {
  id: string;
  name: string;
  archived: boolean;
  sortOrder: number;
}

export interface WorkoutDayRecord {
  id: string;
  planId: string;
  name: string;
  sortOrder: number;
}

export interface DayExerciseRecord {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  exerciseName: string;
  sortOrder: number;
  targetSets: number | null;
  minReps: number | null;
  maxReps: number | null;
  restSeconds: number | null;
  weightIncrement: number | null;
  notes: string | null;
}

interface PlanRow {
  id: string;
  name: string;
  archived: number;
  sort_order: number;
}
interface DayRow {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
}
interface DayExerciseRow {
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

const planFromRow = (r: PlanRow): PlanRecord => ({ id: r.id, name: r.name, archived: !!r.archived, sortOrder: r.sort_order });
const dayFromRow = (r: DayRow): WorkoutDayRecord => ({ id: r.id, planId: r.plan_id, name: r.name, sortOrder: r.sort_order });

export async function listPlans(includeArchived = false): Promise<PlanRecord[]> {
  const db = await getDb();
  const res = await db.query(`SELECT * FROM plans ${includeArchived ? "" : "WHERE archived = 0"} ORDER BY sort_order ASC, created_at ASC`);
  return ((res.values ?? []) as PlanRow[]).map(planFromRow);
}

export async function getPlan(id: string): Promise<PlanRecord | null> {
  const db = await getDb();
  const res = await db.query("SELECT * FROM plans WHERE id = ?", [id]);
  const row = (res.values ?? [])[0] as PlanRow | undefined;
  return row ? planFromRow(row) : null;
}

export async function createPlan(name: string): Promise<PlanRecord> {
  const db = await getDb();
  const id = "plan_" + uid();
  const now = new Date().toISOString();
  const countRes = await db.query("SELECT COUNT(*) as c FROM plans");
  const sortOrder = ((countRes.values?.[0] as { c: number } | undefined)?.c ?? 0) + 1;
  await db.run("INSERT INTO plans (id, name, archived, sort_order, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)", [id, name.trim() || "New Plan", sortOrder, now, now]);
  await persistWebStore();
  return { id, name: name.trim() || "New Plan", archived: false, sortOrder };
}

export async function renamePlan(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE plans SET name = ?, updated_at = ? WHERE id = ?", [name.trim() || "Untitled Plan", new Date().toISOString(), id]);
  await persistWebStore();
}

export async function setPlanArchived(id: string, archived: boolean): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE plans SET archived = ?, updated_at = ? WHERE id = ?", [archived ? 1 : 0, new Date().toISOString(), id]);
  await persistWebStore();
}

/** Deletes a plan and its days/day_exercises. Completed workout history is
 *  untouched — workout_sessions rows keep their own plan_id/workout_day_id
 *  and template_name snapshot regardless of whether those still resolve to
 *  a live row. */
export async function deletePlan(id: string): Promise<void> {
  const db = await getDb();
  const days = await listWorkoutDays(id);
  for (const day of days) {
    await db.run("DELETE FROM day_exercises WHERE workout_day_id = ?", [day.id]);
  }
  await db.run("DELETE FROM workout_days WHERE plan_id = ?", [id]);
  await db.run("DELETE FROM plans WHERE id = ?", [id]);
  await persistWebStore();
}

export async function duplicatePlan(id: string, newName?: string): Promise<PlanRecord> {
  const source = await getPlan(id);
  if (!source) throw new Error("Plan not found");
  const copy = await createPlan(newName?.trim() || `${source.name} (Copy)`);
  const days = await listWorkoutDays(id);
  for (const day of days) {
    const newDay = await createWorkoutDay(copy.id, day.name);
    const dayExercises = await listDayExercises(day.id);
    for (const de of dayExercises) {
      await addDayExercise(newDay.id, de.exerciseId, {
        targetSets: de.targetSets,
        minReps: de.minReps,
        maxReps: de.maxReps,
        restSeconds: de.restSeconds,
        weightIncrement: de.weightIncrement,
        notes: de.notes,
      });
    }
  }
  return copy;
}

export async function listWorkoutDays(planId: string): Promise<WorkoutDayRecord[]> {
  const db = await getDb();
  const res = await db.query("SELECT * FROM workout_days WHERE plan_id = ? ORDER BY sort_order ASC", [planId]);
  return ((res.values ?? []) as DayRow[]).map(dayFromRow);
}

export async function getWorkoutDay(id: string): Promise<WorkoutDayRecord | null> {
  const db = await getDb();
  const res = await db.query("SELECT * FROM workout_days WHERE id = ?", [id]);
  const row = (res.values ?? [])[0] as DayRow | undefined;
  return row ? dayFromRow(row) : null;
}

export async function createWorkoutDay(planId: string, name: string): Promise<WorkoutDayRecord> {
  const db = await getDb();
  const id = "day_" + uid();
  const now = new Date().toISOString();
  const countRes = await db.query("SELECT COUNT(*) as c FROM workout_days WHERE plan_id = ?", [planId]);
  const sortOrder = ((countRes.values?.[0] as { c: number } | undefined)?.c ?? 0) + 1;
  await db.run("INSERT INTO workout_days (id, plan_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [id, planId, name.trim() || "New Day", sortOrder, now, now]);
  await persistWebStore();
  return { id, planId, name: name.trim() || "New Day", sortOrder };
}

export async function renameWorkoutDay(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE workout_days SET name = ?, updated_at = ? WHERE id = ?", [name.trim() || "Untitled Day", new Date().toISOString(), id]);
  await persistWebStore();
}

export async function reorderWorkoutDays(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.run("UPDATE workout_days SET sort_order = ? WHERE id = ?", [i, orderedIds[i]]);
  }
  await persistWebStore();
}

export async function duplicateWorkoutDay(id: string): Promise<WorkoutDayRecord> {
  const source = await getWorkoutDay(id);
  if (!source) throw new Error("Workout day not found");
  const copy = await createWorkoutDay(source.planId, `${source.name} (Copy)`);
  const exercises = await listDayExercises(id);
  for (const de of exercises) {
    await addDayExercise(copy.id, de.exerciseId, {
      targetSets: de.targetSets,
      minReps: de.minReps,
      maxReps: de.maxReps,
      restSeconds: de.restSeconds,
      weightIncrement: de.weightIncrement,
      notes: de.notes,
    });
  }
  return copy;
}

export async function deleteWorkoutDay(id: string): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM day_exercises WHERE workout_day_id = ?", [id]);
  await db.run("DELETE FROM workout_days WHERE id = ?", [id]);
  await persistWebStore();
}

export async function listDayExercises(dayId: string): Promise<DayExerciseRecord[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT de.*, ex.display_name as exercise_name FROM day_exercises de
     JOIN exercises ex ON ex.id = de.exercise_id
     WHERE de.workout_day_id = ? ORDER BY de.sort_order ASC`,
    [dayId]
  );
  return ((res.values ?? []) as (DayExerciseRow & { exercise_name: string })[]).map((r) => ({
    id: r.id,
    workoutDayId: r.workout_day_id,
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    sortOrder: r.sort_order,
    targetSets: r.target_sets,
    minReps: r.min_reps,
    maxReps: r.max_reps,
    restSeconds: r.rest_seconds,
    weightIncrement: r.weight_increment,
    notes: r.notes,
  }));
}

export interface DayExerciseTargets {
  targetSets?: number | null;
  minReps?: number | null;
  maxReps?: number | null;
  restSeconds?: number | null;
  weightIncrement?: number | null;
  notes?: string | null;
}

export async function addDayExercise(dayId: string, exerciseId: string, targets: DayExerciseTargets = {}): Promise<DayExerciseRecord> {
  const db = await getDb();
  const id = "dayex_" + uid();
  const countRes = await db.query("SELECT COUNT(*) as c FROM day_exercises WHERE workout_day_id = ?", [dayId]);
  const sortOrder = ((countRes.values?.[0] as { c: number } | undefined)?.c ?? 0) + 1;
  await db.run(
    `INSERT INTO day_exercises (id, workout_day_id, exercise_id, sort_order, target_sets, min_reps, max_reps, rest_seconds, weight_increment, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, dayId, exerciseId, sortOrder, targets.targetSets ?? null, targets.minReps ?? null, targets.maxReps ?? null, targets.restSeconds ?? null, targets.weightIncrement ?? null, targets.notes ?? null]
  );
  await persistWebStore();
  const exercise = (await getExercise(exerciseId)) as ExerciseRecord;
  return {
    id,
    workoutDayId: dayId,
    exerciseId,
    exerciseName: exercise?.displayName ?? "",
    sortOrder,
    targetSets: targets.targetSets ?? null,
    minReps: targets.minReps ?? null,
    maxReps: targets.maxReps ?? null,
    restSeconds: targets.restSeconds ?? null,
    weightIncrement: targets.weightIncrement ?? null,
    notes: targets.notes ?? null,
  };
}

export async function updateDayExercise(id: string, targets: DayExerciseTargets): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of [
    ["targetSets", "target_sets"],
    ["minReps", "min_reps"],
    ["maxReps", "max_reps"],
    ["restSeconds", "rest_seconds"],
    ["weightIncrement", "weight_increment"],
    ["notes", "notes"],
  ] as const) {
    if (key in targets) {
      fields.push(`${col} = ?`);
      values.push(targets[key as keyof DayExerciseTargets] ?? null);
    }
  }
  if (!fields.length) return;
  values.push(id);
  await db.run(`UPDATE day_exercises SET ${fields.join(", ")} WHERE id = ?`, values);
  await persistWebStore();
}

export async function removeDayExercise(id: string): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM day_exercises WHERE id = ?", [id]);
  await persistWebStore();
}

export async function reorderDayExercises(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.run("UPDATE day_exercises SET sort_order = ? WHERE id = ?", [i, orderedIds[i]]);
  }
  await persistWebStore();
}
