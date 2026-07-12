// Deterministic double-progression guidance. Advisory only — never writes
// to logged data, purely a suggestion shown alongside the next session's
// target for the same exercise/day.
export interface ProgressionInput {
  minReps: number | null;
  maxReps: number | null;
  weightIncrement: number;
  lastSets: { weight: number; reps: number }[];
}

export type ProgressionSuggestion =
  | { kind: "increase_weight"; amount: number; message: string }
  | { kind: "add_reps"; message: string }
  | { kind: "none"; message: string };

/** Target: N x minReps-maxReps. If every working set from the last session
 *  reached maxReps, suggest increasing weight next time by the exercise's
 *  configured increment. Otherwise suggest keeping the weight and trying
 *  for more reps. Requires both minReps and maxReps to be configured and
 *  at least one previous set — otherwise there's nothing to suggest. */
export function suggestProgression(input: ProgressionInput): ProgressionSuggestion {
  const { minReps, maxReps, weightIncrement, lastSets } = input;
  if (!minReps || !maxReps || maxReps <= minReps || !lastSets.length) {
    return { kind: "none", message: "" };
  }
  const allAtOrAboveMax = lastSets.every((s) => s.reps >= maxReps);
  if (allAtOrAboveMax) {
    return {
      kind: "increase_weight",
      amount: weightIncrement,
      message: `All sets hit ${maxReps}+ reps last time — try +${weightIncrement}kg this session.`,
    };
  }
  return {
    kind: "add_reps",
    message: `Aim for more reps at the same weight this session (target ${minReps}–${maxReps}).`,
  };
}
