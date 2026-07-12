import { describe, it, expect } from "vitest";
import { generateMentorPlan } from "../../mentor/rulesEngine";
import { EXERCISE_LIBRARY } from "../../database/exerciseLibrary";
import type { MentorAnswers } from "../../mentor/types";

const LIBRARY_IDS = new Set(EXERCISE_LIBRARY.map((e) => e.id));

const baseAnswers: MentorAnswers = {
  goal: "muscle_gain",
  experience: "intermediate",
  days: 4,
  equipment: "full_gym",
  duration: 60,
  limitation: "none",
  avoidExerciseIds: [],
  avoidBodyAreas: [],
};

describe("generateMentorPlan", () => {
  it("is deterministic — identical answers always produce an identical plan", () => {
    const a = generateMentorPlan(baseAnswers);
    const b = generateMentorPlan(baseAnswers);
    expect(a).toEqual(b);
  });

  it("only ever selects exercises from the curated library", () => {
    const plan = generateMentorPlan(baseAnswers);
    for (const day of plan.days) {
      for (const ex of day.exercises) {
        expect(LIBRARY_IDS.has(ex.exerciseId)).toBe(true);
      }
    }
  });

  it.each([2, 3, 4, 5, 6] as const)("produces exactly %d workout days for %d training days/week", (days) => {
    const plan = generateMentorPlan({ ...baseAnswers, days });
    expect(plan.days).toHaveLength(days);
  });

  it("maps the default structural recommendations correctly", () => {
    expect(generateMentorPlan({ ...baseAnswers, days: 2 }).structure).toBe("Full Body A/B");
    expect(generateMentorPlan({ ...baseAnswers, days: 3 }).structure).toBe("Full Body A/B/C");
    expect(generateMentorPlan({ ...baseAnswers, days: 4 }).structure).toBe("Upper/Lower");
    expect(generateMentorPlan({ ...baseAnswers, days: 5 }).structure).toBe("Upper/Lower/Push/Pull/Legs");
    expect(generateMentorPlan({ ...baseAnswers, days: 6 }).structure).toContain("Push/Pull/Legs");
  });

  it("respects a bodyweight-only equipment constraint", () => {
    const plan = generateMentorPlan({ ...baseAnswers, equipment: "bodyweight" });
    for (const day of plan.days) {
      for (const ex of day.exercises) {
        const entry = EXERCISE_LIBRARY.find((e) => e.id === ex.exerciseId)!;
        expect(entry.equipment).toBe("bodyweight");
      }
    }
  });

  it("never includes an exercise the user asked to avoid", () => {
    const plan = generateMentorPlan({ ...baseAnswers, limitation: "avoid_exercises", avoidExerciseIds: ["back_squat", "conventional_deadlift"] });
    const allIds = plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
    expect(allIds).not.toContain("back_squat");
    expect(allIds).not.toContain("conventional_deadlift");
  });

  it("never includes an exercise whose primary muscle is in the avoided body areas", () => {
    const plan = generateMentorPlan({ ...baseAnswers, limitation: "avoid_body_areas", avoidBodyAreas: ["shoulders"] });
    for (const day of plan.days) {
      for (const ex of day.exercises) {
        const entry = EXERCISE_LIBRARY.find((e) => e.id === ex.exerciseId)!;
        expect(entry.primaryMuscle).not.toBe("shoulders");
      }
    }
  });

  it("shorter sessions produce fewer exercises per day than longer sessions", () => {
    const short = generateMentorPlan({ ...baseAnswers, duration: 30 });
    const long = generateMentorPlan({ ...baseAnswers, duration: 75 });
    expect(short.days[0].exercises.length).toBeLessThan(long.days[0].exercises.length);
  });

  it("strength goal uses lower rep ranges than muscle_gain for compound lifts", () => {
    const strength = generateMentorPlan({ ...baseAnswers, goal: "strength" });
    const hypertrophy = generateMentorPlan({ ...baseAnswers, goal: "muscle_gain" });
    expect(strength.days[0].exercises[0].maxReps).toBeLessThanOrEqual(hypertrophy.days[0].exercises[0].maxReps);
  });

  it("every generated exercise has a valid, non-empty target", () => {
    const plan = generateMentorPlan(baseAnswers);
    for (const day of plan.days) {
      expect(day.exercises.length).toBeGreaterThan(0);
      for (const ex of day.exercises) {
        expect(ex.targetSets).toBeGreaterThan(0);
        expect(ex.minReps).toBeGreaterThan(0);
        expect(ex.maxReps).toBeGreaterThanOrEqual(ex.minReps);
      }
    }
  });
});
