import type { AppData, SetEntry } from "../app/types";

// Template/workout-day-specific autofill: only looks at the most recent
// workout that used the SAME template id, so "Push Heavy Bench Press"
// autofills from the last Push Heavy session, never from Push Volume.
export function lastSets(data: AppData, exName: string, templateId?: string): SetEntry[] {
  const sorted = [...data.workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const w of sorted) {
    if (templateId && w.templateId !== templateId) continue;
    const e = w.entries.find((x) => x.exerciseName.toLowerCase() === exName.toLowerCase());
    if (e && e.sets.length) return e.sets.map((s) => ({ weight: s.weight, reps: s.reps }));
  }
  return [];
}
