import { describe, it, expect } from "vitest";
import { standardizeExerciseName, standardizeExerciseNames } from "../../workouts/aliases";
import type { AppData } from "../../app/types";

describe("standardizeExerciseName", () => {
  it("maps known aliases case-insensitively", () => {
    expect(standardizeExerciseName("RDL")).toBe("Romanian Deadlift");
    expect(standardizeExerciseName("rdl")).toBe("Romanian Deadlift");
    expect(standardizeExerciseName("Bench")).toBe("Bench Press");
    expect(standardizeExerciseName("DB Shoulder Press")).toBe("Dumbbell Shoulder Press");
    expect(standardizeExerciseName("Pulldown")).toBe("Lat Pulldown");
  });

  it("is idempotent — re-standardizing a canonical name is a no-op", () => {
    const once = standardizeExerciseName("RDL");
    expect(standardizeExerciseName(once)).toBe(once);
  });

  it("passes through unknown names unchanged instead of dropping them", () => {
    expect(standardizeExerciseName("Farmer Carry")).toBe("Farmer Carry");
  });

  it("handles empty/blank input without throwing", () => {
    expect(standardizeExerciseName("")).toBe("");
    expect(standardizeExerciseName("   ")).toBe("");
  });
});

describe("standardizeExerciseNames", () => {
  it("rewrites both template exercises and workout entries in place", () => {
    const data: AppData = {
      templates: [{ id: "t1", name: "Legs", exercises: [{ id: "e1", name: "RDL", sets: 3, reps: "8" }] }],
      workouts: [
        {
          id: "w1",
          templateId: "t1",
          templateName: "Legs",
          date: "2026-01-01T00:00:00.000Z",
          entries: [{ exerciseName: "Pull-ups", sets: [{ weight: "0", reps: "8" }] }],
        },
      ],
      settings: { pullupBodyweight: "" },
      meta: { lastManualBackupAt: "", lastSnapshotAt: "", lastMirrorAt: "", persistentGranted: null, persistentCheckedAt: "", protectionStartedAt: "" },
    };
    standardizeExerciseNames(data);
    expect(data.templates[0].exercises[0].name).toBe("Romanian Deadlift");
    expect(data.workouts[0].entries[0].exerciseName).toBe("Pull-Up");
  });
});
