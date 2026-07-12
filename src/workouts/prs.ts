import type { AppData } from "../app/types";
import { toNum } from "../app/format";

export interface PRRow {
  name: string;
  weight: number;
  reps: number;
  date: string;
}

// Heaviest set per exercise name (case-insensitive), ties broken by more reps.
export function allPRs(data: AppData): PRRow[] {
  const best = new Map<string, PRRow>();
  for (const w of data.workouts) {
    for (const e of w.entries) {
      const name = String(e.exerciseName || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      for (const set of e.sets) {
        const weight = toNum(set.weight);
        const reps = toNum(set.reps);
        if (reps <= 0 && weight <= 0) continue;
        const cur = best.get(key);
        if (!cur || weight > cur.weight || (weight === cur.weight && reps > cur.reps)) {
          best.set(key, { name, weight, reps, date: w.date });
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight || b.reps - a.reps);
}
