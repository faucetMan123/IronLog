import { describe, it, expect } from "vitest";
import { buildText, buildTSV } from "../../exports/export";
import type { AppData } from "../../app/types";

const data: AppData = {
  templates: [],
  workouts: [
    {
      id: "w1",
      templateId: "t1",
      templateName: "Push Heavy",
      date: "2026-01-01T12:00:00.000Z",
      entries: [{ exerciseName: "Bench Press", sets: [{ weight: "80", reps: "6" }] }],
    },
  ],
  settings: { pullupBodyweight: "" },
  meta: { lastManualBackupAt: "", lastSnapshotAt: "", lastMirrorAt: "", persistentGranted: null, persistentCheckedAt: "", protectionStartedAt: "" },
};

describe("buildText", () => {
  it("includes the template name, exercise name, and weight x reps", () => {
    const text = buildText(data);
    expect(text).toContain("Push Heavy");
    expect(text).toContain("Bench Press: 80kg x 6");
  });
});

describe("buildTSV", () => {
  it("emits a header row plus one row per set", () => {
    const tsv = buildTSV(data);
    const lines = tsv.trim().split("\n");
    expect(lines[0]).toBe("Date\tTemplate\tExercise\tSet\tWeight(kg)\tReps");
    expect(lines[1]).toContain("Bench Press");
    expect(lines[1]).toContain("80");
    expect(lines[1]).toContain("6");
  });
});
