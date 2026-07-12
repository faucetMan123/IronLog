import { describe, it, expect } from "vitest";
import { allPRs } from "../../workouts/prs";
import type { AppData } from "../../app/types";

function dataWith(workouts: AppData["workouts"]): AppData {
  return {
    templates: [],
    workouts,
    settings: { pullupBodyweight: "" },
    meta: { lastManualBackupAt: "", lastSnapshotAt: "", lastMirrorAt: "", persistentGranted: null, persistentCheckedAt: "", protectionStartedAt: "" },
  };
}

describe("allPRs", () => {
  it("picks the heaviest set per exercise across all history", () => {
    const data = dataWith([
      { id: "w1", templateId: "t1", templateName: "Push Heavy", date: "2026-01-01T00:00:00.000Z", entries: [{ exerciseName: "Bench Press", sets: [{ weight: "70", reps: "6" }] }] },
      { id: "w2", templateId: "t1", templateName: "Push Heavy", date: "2026-02-01T00:00:00.000Z", entries: [{ exerciseName: "Bench Press", sets: [{ weight: "80", reps: "5" }] }] },
    ]);
    const prs = allPRs(data);
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({ name: "Bench Press", weight: 80, reps: 5, date: "2026-02-01T00:00:00.000Z" });
  });

  it("breaks ties on equal weight by preferring more reps", () => {
    const data = dataWith([
      { id: "w1", templateId: "t1", templateName: "Push Heavy", date: "2026-01-01T00:00:00.000Z", entries: [{ exerciseName: "Squat", sets: [{ weight: "100", reps: "5" }] }] },
      { id: "w2", templateId: "t1", templateName: "Push Heavy", date: "2026-02-01T00:00:00.000Z", entries: [{ exerciseName: "Squat", sets: [{ weight: "100", reps: "8" }] }] },
    ]);
    expect(allPRs(data)[0]).toMatchObject({ weight: 100, reps: 8 });
  });

  it("treats exercise names case-insensitively", () => {
    const data = dataWith([
      { id: "w1", templateId: "t1", templateName: "Pull Heavy", date: "2026-01-01T00:00:00.000Z", entries: [{ exerciseName: "pull-up", sets: [{ weight: "0", reps: "8" }] }] },
      { id: "w2", templateId: "t1", templateName: "Pull Heavy", date: "2026-02-01T00:00:00.000Z", entries: [{ exerciseName: "Pull-Up", sets: [{ weight: "10", reps: "5" }] }] },
    ]);
    expect(allPRs(data)).toHaveLength(1);
  });

  it("ignores sets with no weight and no reps", () => {
    const data = dataWith([
      { id: "w1", templateId: "t1", templateName: "Push Heavy", date: "2026-01-01T00:00:00.000Z", entries: [{ exerciseName: "Bench Press", sets: [{ weight: "", reps: "" }] }] },
    ]);
    expect(allPRs(data)).toHaveLength(0);
  });
});
