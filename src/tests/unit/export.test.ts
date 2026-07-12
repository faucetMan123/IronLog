import { describe, it, expect } from "vitest";
import { buildText, buildCSV } from "../../exports/export";
import type { SessionDetail } from "../../database/sessionsRepo";

const sessions: SessionDetail[] = [
  {
    id: "session_1",
    templateName: "Push Heavy",
    completedAt: "2026-01-01T12:00:00.000Z",
    notes: null,
    exercises: [{ id: "pe1", exerciseId: "bench_press_barbell", exerciseName: "Bench Press", sets: [{ setIndex: 0, weight: 80, reps: 6, rir: null }] }],
  },
];

describe("buildText", () => {
  it("includes the template name, exercise name, and weight x reps", () => {
    const text = buildText(sessions);
    expect(text).toContain("Push Heavy");
    expect(text).toContain("Bench Press: 80kg x 6");
  });
});

describe("buildCSV", () => {
  it("emits a header row plus one row per set", () => {
    const csv = buildCSV(sessions);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("Date,Template,Exercise,Set,Weight(kg),Reps");
    expect(lines[1]).toContain("Bench Press");
    expect(lines[1]).toContain("80");
    expect(lines[1]).toContain("6");
  });
});
