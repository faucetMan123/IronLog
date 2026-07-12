import { describe, it, expect } from "vitest";
import { lastSets } from "../../workouts/autofill";
import type { AppData } from "../../app/types";

function dataWith(workouts: AppData["workouts"]): AppData {
  return {
    templates: [],
    workouts,
    settings: { pullupBodyweight: "" },
    meta: { lastManualBackupAt: "", lastSnapshotAt: "", lastMirrorAt: "", persistentGranted: null, persistentCheckedAt: "", protectionStartedAt: "" },
  };
}

describe("lastSets (template-specific autofill)", () => {
  it("autofills from the most recent session of the SAME template only", () => {
    const data = dataWith([
      { id: "w1", templateId: "t1", templateName: "Push Heavy", date: "2026-01-01T00:00:00.000Z", entries: [{ exerciseName: "Bench Press", sets: [{ weight: "70", reps: "6" }] }] },
      { id: "w2", templateId: "t4", templateName: "Push Volume", date: "2026-01-05T00:00:00.000Z", entries: [{ exerciseName: "Bench Press", sets: [{ weight: "60", reps: "10" }] }] },
    ]);
    expect(lastSets(data, "Bench Press", "t1")).toEqual([{ weight: "70", reps: "6" }]);
    expect(lastSets(data, "Bench Press", "t4")).toEqual([{ weight: "60", reps: "10" }]);
  });

  it("returns nothing when the exercise has never been logged under that template", () => {
    const data = dataWith([
      { id: "w1", templateId: "t4", templateName: "Push Volume", date: "2026-01-01T00:00:00.000Z", entries: [{ exerciseName: "Bench Press", sets: [{ weight: "60", reps: "10" }] }] },
    ]);
    expect(lastSets(data, "Bench Press", "t1")).toEqual([]);
  });

  it("without a templateId, falls back to the most recent session across all templates", () => {
    const data = dataWith([
      { id: "w1", templateId: "t1", templateName: "Push Heavy", date: "2026-01-01T00:00:00.000Z", entries: [{ exerciseName: "Bench Press", sets: [{ weight: "70", reps: "6" }] }] },
      { id: "w2", templateId: "t4", templateName: "Push Volume", date: "2026-01-05T00:00:00.000Z", entries: [{ exerciseName: "Bench Press", sets: [{ weight: "60", reps: "10" }] }] },
    ]);
    expect(lastSets(data, "Bench Press")).toEqual([{ weight: "60", reps: "10" }]);
  });
});
