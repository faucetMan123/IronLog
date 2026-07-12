import type { AppData } from "../app/types";

// Historical exercise-name normalization, carried over verbatim from the
// v15 app. New code should prefer stable exercise ids (see
// src/database/exerciseLibrary.ts) — this alias table exists so that
// legacy display-name-only data keeps resolving to the same canonical
// names it always has, both for in-place normalization of old records and
// as the first pass of v15->new-schema exercise id resolution.
export const EXERCISE_NAME_ALIASES: Record<string, string> = {
  "bench": "Bench Press",
  "bench press": "Bench Press",
  "incline db": "Incline Dumbbell Press",
  "incline db press": "Incline Dumbbell Press",
  "incline dumbbell press": "Incline Dumbbell Press",
  "db shoulder press": "Dumbbell Shoulder Press",
  "dumbbell shoulder press": "Dumbbell Shoulder Press",
  "rope pushdown": "Triceps Pushdown",
  "pushdown": "Triceps Pushdown",
  "triceps pushdown": "Triceps Pushdown",
  "rope triceps pushdown": "Triceps Pushdown",
  "pull-ups": "Pull-Up",
  "pullups": "Pull-Up",
  "pull up": "Pull-Up",
  "pull-up": "Pull-Up",
  "lat pulldown": "Lat Pulldown",
  "pulldown": "Lat Pulldown",
  "seated row": "Seated Cable Row",
  "seated cable rowing": "Seated Cable Row",
  "seated cable row": "Seated Cable Row",
  "ez curl": "EZ-Bar Curl",
  "ez/bar curl": "EZ-Bar Curl",
  "ez bar curl": "EZ-Bar Curl",
  "ez-bar curl": "EZ-Bar Curl",
  "rdl": "Romanian Deadlift",
  "romanian deadlift": "Romanian Deadlift",
  "cable fly": "Cable Chest Fly",
  "cable chest fly": "Cable Chest Fly",
};

export function standardizeExerciseName(name: unknown): string {
  const raw = String(name ?? "").trim();
  if (!raw) return raw;
  const key = raw.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ");
  return EXERCISE_NAME_ALIASES[key] || raw;
}

export function standardizeExerciseNames(d: AppData): AppData {
  if (Array.isArray(d.templates)) {
    d.templates.forEach((t) => {
      if (Array.isArray(t.exercises)) {
        t.exercises.forEach((ex) => {
          ex.name = standardizeExerciseName(ex.name);
        });
      }
    });
  }
  if (Array.isArray(d.workouts)) {
    d.workouts.forEach((w) => {
      if (Array.isArray(w.entries)) {
        w.entries.forEach((e) => {
          e.exerciseName = standardizeExerciseName(e.exerciseName);
        });
      }
    });
  }
  return d;
}
