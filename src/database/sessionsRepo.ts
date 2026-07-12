// Repository for workout_sessions / performed_exercises / performed_sets /
// workout_drafts — the workout-execution and history data.
import { getDb, persistWebStore } from "./db";
import { uid } from "../app/format";

export interface DraftSet {
  weight: string;
  reps: string;
  rir?: string;
}
export interface DraftExercise {
  exerciseId: string;
  exerciseName: string;
  dayExerciseId: string | null;
  target: string;
  notes: string;
  sets: DraftSet[];
  minReps?: number | null;
  maxReps?: number | null;
  weightIncrement?: number | null;
  restSeconds?: number | null;
}
export interface WorkoutDraft {
  id: string;
  planId: string | null;
  workoutDayId: string | null;
  templateName: string;
  startedAt: string;
  notes: string;
  exercises: DraftExercise[];
}

const DRAFT_SINGLETON_ID = "current"; // only one in-progress workout at a time, matching v15 behavior

export async function saveDraft(draft: WorkoutDraft): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run(
    `INSERT OR REPLACE INTO workout_drafts (id, plan_id, workout_day_id, template_name, started_at, updated_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [DRAFT_SINGLETON_ID, draft.planId, draft.workoutDayId, draft.templateName, draft.startedAt, now, JSON.stringify(draft)]
  );
  await persistWebStore();
}

export async function loadDraft(): Promise<WorkoutDraft | null> {
  const db = await getDb();
  const res = await db.query("SELECT payload FROM workout_drafts WHERE id = ?", [DRAFT_SINGLETON_ID]);
  const row = (res.values ?? [])[0] as { payload: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as WorkoutDraft;
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM workout_drafts WHERE id = ?", [DRAFT_SINGLETON_ID]);
  await persistWebStore();
}

/** Sets from the most recent COMPLETED session of the same workout_day —
 *  the SQLite-era equivalent of v15's template-scoped lastSets(). Passing
 *  no dayId falls back to the most recent session of this exercise
 *  regardless of day (used for exercises added ad hoc, with no day_exercise
 *  origin). */
export async function lastPerformedSets(exerciseId: string, workoutDayId: string | null): Promise<DraftSet[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT ps.weight, ps.reps, ps.rir
     FROM performed_sets ps
     JOIN performed_exercises pe ON pe.id = ps.performed_exercise_id
     JOIN workout_sessions ws ON ws.id = pe.workout_session_id
     WHERE pe.exercise_id = ? ${workoutDayId ? "AND ws.workout_day_id = ?" : ""}
     ORDER BY ws.completed_at DESC, ps.set_index ASC
     LIMIT 50`,
    workoutDayId ? [exerciseId, workoutDayId] : [exerciseId]
  );
  const rows = (res.values ?? []) as { weight: number; reps: number; rir: number | null }[];
  if (!rows.length) return [];
  // All rows are already ordered most-recent-session-first; take the
  // leading run that belongs to the single most recent session by relying
  // on set_index resetting — simplest robust approach: re-query the
  // specific most recent session id, then pull its sets in order.
  const sessionRes = await db.query(
    `SELECT ws.id as session_id
     FROM performed_exercises pe
     JOIN workout_sessions ws ON ws.id = pe.workout_session_id
     WHERE pe.exercise_id = ? ${workoutDayId ? "AND ws.workout_day_id = ?" : ""}
     ORDER BY ws.completed_at DESC LIMIT 1`,
    workoutDayId ? [exerciseId, workoutDayId] : [exerciseId]
  );
  const sessionId = (sessionRes.values?.[0] as { session_id: string } | undefined)?.session_id;
  if (!sessionId) return [];
  const setsRes = await db.query(
    `SELECT ps.weight, ps.reps, ps.rir FROM performed_sets ps
     JOIN performed_exercises pe ON pe.id = ps.performed_exercise_id
     WHERE pe.workout_session_id = ? AND pe.exercise_id = ?
     ORDER BY ps.set_index ASC`,
    [sessionId, exerciseId]
  );
  return ((setsRes.values ?? []) as { weight: number; reps: number; rir: number | null }[]).map((r) => ({
    weight: String(r.weight),
    reps: String(r.reps),
    rir: r.rir != null ? String(r.rir) : undefined,
  }));
}

export async function finishSession(draft: WorkoutDraft): Promise<string | null> {
  const entries = draft.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => String(s.weight).trim() !== "" || String(s.reps).trim() !== "") }))
    .filter((e) => e.sets.length);
  if (!entries.length) return null;

  const db = await getDb();
  const sessionId = "session_" + uid();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO workout_sessions (id, plan_id, workout_day_id, template_name, started_at, completed_at, notes, source) VALUES (?, ?, ?, ?, ?, ?, ?, 'app')`,
    [sessionId, draft.planId, draft.workoutDayId, draft.templateName, draft.startedAt, now, draft.notes || null]
  );
  for (let ei = 0; ei < entries.length; ei++) {
    const e = entries[ei];
    const peId = "pe_" + uid();
    await db.run(
      `INSERT INTO performed_exercises (id, workout_session_id, exercise_id, exercise_name, sort_order, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [peId, sessionId, e.exerciseId, e.exerciseName, ei, e.notes || null]
    );
    for (let si = 0; si < e.sets.length; si++) {
      const s = e.sets[si];
      await db.run(
        `INSERT INTO performed_sets (id, performed_exercise_id, set_index, weight, reps, rir, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["ps_" + uid(), peId, si, Number(s.weight) || 0, Number(s.reps) || 0, s.rir ? Number(s.rir) : null, now]
      );
    }
  }
  await clearDraft();
  await persistWebStore();
  return sessionId;
}

export interface SessionSummary {
  id: string;
  templateName: string;
  completedAt: string;
  exerciseCount: number;
}

export async function listHistory(): Promise<SessionSummary[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT ws.id, ws.template_name, ws.completed_at, COUNT(pe.id) as exercise_count
     FROM workout_sessions ws
     LEFT JOIN performed_exercises pe ON pe.workout_session_id = ws.id
     GROUP BY ws.id ORDER BY ws.completed_at DESC`
  );
  return ((res.values ?? []) as { id: string; template_name: string; completed_at: string; exercise_count: number }[]).map((r) => ({
    id: r.id,
    templateName: r.template_name,
    completedAt: r.completed_at,
    exerciseCount: r.exercise_count,
  }));
}

export interface SessionDetailExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: { setIndex: number; weight: number; reps: number; rir: number | null }[];
}
export interface SessionDetail {
  id: string;
  templateName: string;
  completedAt: string;
  notes: string | null;
  exercises: SessionDetailExercise[];
}

export async function getSessionDetail(id: string): Promise<SessionDetail | null> {
  const db = await getDb();
  const sessionRes = await db.query("SELECT * FROM workout_sessions WHERE id = ?", [id]);
  const sessionRow = (sessionRes.values ?? [])[0] as { id: string; template_name: string; completed_at: string; notes: string | null } | undefined;
  if (!sessionRow) return null;
  const exRes = await db.query("SELECT * FROM performed_exercises WHERE workout_session_id = ? ORDER BY sort_order ASC", [id]);
  const exRows = (exRes.values ?? []) as { id: string; exercise_id: string; exercise_name: string }[];
  const exercises: SessionDetailExercise[] = [];
  for (const ex of exRows) {
    const setRes = await db.query("SELECT * FROM performed_sets WHERE performed_exercise_id = ? ORDER BY set_index ASC", [ex.id]);
    const sets = ((setRes.values ?? []) as { set_index: number; weight: number; reps: number; rir: number | null }[]).map((s) => ({
      setIndex: s.set_index,
      weight: s.weight,
      reps: s.reps,
      rir: s.rir,
    }));
    exercises.push({ id: ex.id, exerciseId: ex.exercise_id, exerciseName: ex.exercise_name, sets });
  }
  return { id: sessionRow.id, templateName: sessionRow.template_name, completedAt: sessionRow.completed_at, notes: sessionRow.notes, exercises };
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  const exRes = await db.query("SELECT id FROM performed_exercises WHERE workout_session_id = ?", [id]);
  const exIds = ((exRes.values ?? []) as { id: string }[]).map((r) => r.id);
  for (const exId of exIds) {
    await db.run("DELETE FROM performed_sets WHERE performed_exercise_id = ?", [exId]);
  }
  await db.run("DELETE FROM performed_exercises WHERE workout_session_id = ?", [id]);
  await db.run("DELETE FROM workout_sessions WHERE id = ?", [id]);
  await persistWebStore();
}

export interface PRRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
}

/** Heaviest set per exercise id (ties broken by more reps) — identical rule
 *  to v15's allPRs(), but grouped by stable exercise_id instead of a
 *  lowercased name string. */
export async function allPRs(): Promise<PRRecord[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT pe.exercise_id, pe.exercise_name, ps.weight, ps.reps, ws.completed_at
     FROM performed_sets ps
     JOIN performed_exercises pe ON pe.id = ps.performed_exercise_id
     JOIN workout_sessions ws ON ws.id = pe.workout_session_id
     WHERE ps.weight > 0 OR ps.reps > 0`
  );
  const rows = (res.values ?? []) as { exercise_id: string; exercise_name: string; weight: number; reps: number; completed_at: string }[];
  const best = new Map<string, PRRecord>();
  for (const r of rows) {
    const cur = best.get(r.exercise_id);
    if (!cur || r.weight > cur.weight || (r.weight === cur.weight && r.reps > cur.reps)) {
      best.set(r.exercise_id, { exerciseId: r.exercise_id, exerciseName: r.exercise_name, weight: r.weight, reps: r.reps, date: r.completed_at });
    }
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight || b.reps - a.reps);
}

export interface ExerciseProgressRow {
  date: string;
  isoDate: string;
  topWeight: number;
  volume: number;
}

/** All completed-session data points for one exercise, for the Progress
 *  screen. Date filtering (1m/6m/1y/all) is applied by the caller so this
 *  stays a simple, cacheable query. */
export async function exerciseProgressRows(exerciseId: string): Promise<ExerciseProgressRow[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT ws.completed_at, ps.weight, ps.reps
     FROM performed_sets ps
     JOIN performed_exercises pe ON pe.id = ps.performed_exercise_id
     JOIN workout_sessions ws ON ws.id = pe.workout_session_id
     WHERE pe.exercise_id = ?
     ORDER BY ws.completed_at ASC`,
    [exerciseId]
  );
  const bySession = new Map<string, { weight: number; reps: number }[]>();
  for (const r of (res.values ?? []) as { completed_at: string; weight: number; reps: number }[]) {
    if (!bySession.has(r.completed_at)) bySession.set(r.completed_at, []);
    bySession.get(r.completed_at)!.push({ weight: r.weight, reps: r.reps });
  }
  return [...bySession.entries()].map(([isoDate, sets]) => ({
    isoDate,
    date: new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    topWeight: Math.max(0, ...sets.map((s) => s.weight)),
    volume: sets.reduce((a, s) => a + s.weight * s.reps, 0),
  }));
}

export interface DayVolumeRow {
  date: string;
  isoDate: string;
  volume: number;
}

export async function dayVolumeRows(workoutDayId: string): Promise<DayVolumeRow[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT ws.id, ws.completed_at, ps.weight, ps.reps
     FROM workout_sessions ws
     JOIN performed_exercises pe ON pe.workout_session_id = ws.id
     JOIN performed_sets ps ON ps.performed_exercise_id = pe.id
     WHERE ws.workout_day_id = ?
     ORDER BY ws.completed_at ASC`,
    [workoutDayId]
  );
  const bySession = new Map<string, { isoDate: string; volume: number }>();
  for (const r of (res.values ?? []) as { id: string; completed_at: string; weight: number; reps: number }[]) {
    const cur = bySession.get(r.id) ?? { isoDate: r.completed_at, volume: 0 };
    cur.volume += r.weight * r.reps;
    bySession.set(r.id, cur);
  }
  return [...bySession.values()].map((v) => ({ isoDate: v.isoDate, date: new Date(v.isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }), volume: v.volume }));
}

export async function distinctPerformedExerciseIds(): Promise<{ exerciseId: string; exerciseName: string }[]> {
  const db = await getDb();
  const res = await db.query(
    `SELECT DISTINCT pe.exercise_id as exercise_id, pe.exercise_name as exercise_name FROM performed_exercises pe ORDER BY pe.exercise_name ASC`
  );
  return ((res.values ?? []) as { exercise_id: string; exercise_name: string }[]).map((r) => ({ exerciseId: r.exercise_id, exerciseName: r.exercise_name }));
}

export interface RangeStats {
  sessions: number;
  sets: number;
}

export async function statsForRange(startIso: string | null): Promise<RangeStats> {
  const db = await getDb();
  const sessionsRes = await db.query(`SELECT COUNT(*) as c FROM workout_sessions ${startIso ? "WHERE completed_at >= ?" : ""}`, startIso ? [startIso] : []);
  const setsRes = await db.query(
    `SELECT COUNT(*) as c FROM performed_sets ps
     JOIN performed_exercises pe ON pe.id = ps.performed_exercise_id
     JOIN workout_sessions ws ON ws.id = pe.workout_session_id
     ${startIso ? "WHERE ws.completed_at >= ?" : ""}`,
    startIso ? [startIso] : []
  );
  return {
    sessions: (sessionsRes.values?.[0] as { c: number } | undefined)?.c ?? 0,
    sets: (setsRes.values?.[0] as { c: number } | undefined)?.c ?? 0,
  };
}

export async function hasAnySessions(): Promise<boolean> {
  const db = await getDb();
  const res = await db.query("SELECT COUNT(*) as c FROM workout_sessions");
  return ((res.values?.[0] as { c: number } | undefined)?.c ?? 0) > 0;
}
