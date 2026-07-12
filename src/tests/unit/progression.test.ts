import { describe, it, expect } from "vitest";
import { suggestProgression } from "../../workouts/progression";

describe("suggestProgression", () => {
  it("suggests a weight increase when every set reached the top of the rep range", () => {
    const result = suggestProgression({ minReps: 8, maxReps: 12, weightIncrement: 2.5, lastSets: [{ weight: 60, reps: 12 }, { weight: 60, reps: 13 }] });
    expect(result.kind).toBe("increase_weight");
    if (result.kind === "increase_weight") expect(result.amount).toBe(2.5);
  });

  it("suggests more reps at the same weight when the top wasn't reached", () => {
    const result = suggestProgression({ minReps: 8, maxReps: 12, weightIncrement: 2.5, lastSets: [{ weight: 60, reps: 9 }, { weight: 60, reps: 8 }] });
    expect(result.kind).toBe("add_reps");
  });

  it("suggests nothing without a configured rep range", () => {
    expect(suggestProgression({ minReps: null, maxReps: null, weightIncrement: 2.5, lastSets: [{ weight: 60, reps: 12 }] }).kind).toBe("none");
  });

  it("suggests nothing with no prior sets to compare against", () => {
    expect(suggestProgression({ minReps: 8, maxReps: 12, weightIncrement: 2.5, lastSets: [] }).kind).toBe("none");
  });

  it("is advisory only — never mutates its input", () => {
    const input = { minReps: 8, maxReps: 12, weightIncrement: 2.5, lastSets: [{ weight: 60, reps: 12 }] };
    const snapshot = JSON.parse(JSON.stringify(input));
    suggestProgression(input);
    expect(input).toEqual(snapshot);
  });
});
