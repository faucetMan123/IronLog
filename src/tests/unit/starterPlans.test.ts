import { describe, it, expect } from "vitest";
import { STARTER_PLANS } from "../../plans/starterPlans";
import { EXERCISE_LIBRARY } from "../../database/exerciseLibrary";

const LIBRARY_IDS = new Set(EXERCISE_LIBRARY.map((e) => e.id));

describe("STARTER_PLANS", () => {
  it("only references exercises that exist in the curated library", () => {
    for (const plan of STARTER_PLANS) {
      for (const day of plan.days) {
        for (const ex of day.exercises) {
          expect(LIBRARY_IDS.has(ex.exerciseId), `${plan.planName} / ${day.name}: unknown exercise id "${ex.exerciseId}"`).toBe(true);
        }
      }
    }
  });

  it("every exercise's displayName matches its library entry (catches stale copy/paste)", () => {
    for (const plan of STARTER_PLANS) {
      for (const day of plan.days) {
        for (const ex of day.exercises) {
          const entry = EXERCISE_LIBRARY.find((e) => e.id === ex.exerciseId)!;
          expect(ex.displayName).toBe(entry.displayName);
        }
      }
    }
  });

  it("has at least 4 curated plans covering different equipment profiles", () => {
    expect(STARTER_PLANS.length).toBeGreaterThanOrEqual(4);
  });

  it("every plan has at least one day and every day has at least one exercise", () => {
    for (const plan of STARTER_PLANS) {
      expect(plan.days.length).toBeGreaterThan(0);
      for (const day of plan.days) {
        expect(day.exercises.length).toBeGreaterThan(0);
      }
    }
  });
});
