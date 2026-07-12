// Deterministic, local, rules-based programme generator. Not an AI
// chatbot: same answers always produce the same plan. Only ever selects
// exercises from the curated local exercise library (src/database/
// exerciseLibrary.ts) — never invents exercise names.
import { EXERCISE_LIBRARY, type Equipment, type ExerciseLibraryEntry, type MovementCategory } from "../database/exerciseLibrary";
import type { MentorAnswers, MentorDays, MentorExperience, MentorGoal, MentorPlan, MentorPlanDay, MentorPlanDayExercise } from "./types";

const STRUCTURE_BY_DAYS: Record<MentorDays, { name: string; dayTypes: DayType[] }> = {
  2: { name: "Full Body A/B", dayTypes: ["full_body_a", "full_body_b"] },
  3: { name: "Full Body A/B/C", dayTypes: ["full_body_a", "full_body_b", "full_body_c"] },
  4: { name: "Upper/Lower", dayTypes: ["upper", "lower", "upper", "lower"] },
  5: { name: "Upper/Lower/Push/Pull/Legs", dayTypes: ["upper", "lower", "push", "pull", "legs"] },
  6: { name: "Push/Pull/Legs (repeated)", dayTypes: ["push", "pull", "legs", "push", "pull", "legs"] },
};

const STRUCTURE_EXPLANATION: Record<MentorDays, string> = {
  2: "With 2 days a week, training the whole body each session gets every muscle group enough frequency to make progress.",
  3: "3 full-body sessions a week is the most efficient way to hit every muscle group twice with room to recover between sessions.",
  4: "Splitting into Upper/Lower lets each muscle group be trained twice a week with more volume per session than a full-body approach.",
  5: "5 days allows an Upper/Lower base plus dedicated Push/Pull/Legs days for extra volume on top priority areas.",
  6: "6 days supports a full Push/Pull/Legs cycle run twice a week — high frequency and volume for experienced lifters who recover well.",
};

type DayType = "full_body_a" | "full_body_b" | "full_body_c" | "upper" | "lower" | "push" | "pull" | "legs";

const DAY_TYPE_LABEL: Record<DayType, string> = {
  full_body_a: "Full Body A",
  full_body_b: "Full Body B",
  full_body_c: "Full Body C",
  upper: "Upper",
  lower: "Lower",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

// Movement-category "slots" per day type, in priority order (compounds
// first). Duration trims from the end of this list.
const DAY_TYPE_SLOTS: Record<DayType, MovementCategory[]> = {
  full_body_a: ["squat", "horizontal_push", "horizontal_pull", "hinge", "vertical_pull", "isolation"],
  full_body_b: ["hinge", "vertical_push", "horizontal_pull", "squat", "isolation", "core"],
  full_body_c: ["lunge", "horizontal_push", "vertical_pull", "hinge", "isolation", "core"],
  upper: ["horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull", "isolation", "isolation"],
  lower: ["squat", "hinge", "lunge", "isolation", "isolation", "isolation"],
  push: ["horizontal_push", "vertical_push", "isolation", "isolation"],
  pull: ["vertical_pull", "horizontal_pull", "isolation", "isolation"],
  legs: ["squat", "hinge", "lunge", "isolation", "isolation"],
};

const EQUIPMENT_ALLOWLIST: Record<MentorAnswers["equipment"], Equipment[]> = {
  full_gym: ["barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "ez_bar", "smith_machine", "trap_bar", "bands"],
  dumbbells: ["dumbbell", "bodyweight"],
  basic_home_gym: ["dumbbell", "bodyweight", "kettlebell", "bands"],
  bodyweight: ["bodyweight"],
};

const EXERCISES_PER_DAY_BY_DURATION: Record<MentorAnswers["duration"], number> = { 30: 4, 45: 5, 60: 7, 75: 9 };

const SETS_BY_EXPERIENCE: Record<MentorExperience, number> = { beginner: 3, intermediate: 3, advanced: 4 };

const REP_RANGE_BY_GOAL: Record<MentorGoal, { compound: [number, number]; isolation: [number, number] }> = {
  muscle_gain: { compound: [6, 10], isolation: [10, 15] },
  strength: { compound: [3, 6], isolation: [8, 12] },
  general_fitness: { compound: [8, 12], isolation: [12, 15] },
  fat_loss_support: { compound: [8, 12], isolation: [12, 20] },
};

const COMPOUND_CATEGORIES: MovementCategory[] = ["squat", "hinge", "lunge", "horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull"];

function isCompound(category: MovementCategory): boolean {
  return COMPOUND_CATEGORIES.includes(category);
}

function restSecondsFor(goal: MentorGoal, compound: boolean): number {
  if (goal === "strength") return compound ? 180 : 90;
  return compound ? 90 : 60;
}

function pickExercise(
  category: MovementCategory,
  allowedEquipment: Equipment[],
  avoidExerciseIds: Set<string>,
  avoidBodyAreas: Set<string>,
  alreadyUsed: Set<string>
): ExerciseLibraryEntry | null {
  const candidates = EXERCISE_LIBRARY.filter(
    (e) =>
      e.movementCategory === category &&
      allowedEquipment.includes(e.equipment) &&
      !avoidExerciseIds.has(e.id) &&
      !avoidBodyAreas.has(e.primaryMuscle) &&
      !alreadyUsed.has(e.id)
  );
  if (!candidates.length) return null;
  // Deterministic tie-break: stable library order (already curated
  // best-first per category by construction of exerciseLibrary.ts).
  return candidates[0];
}

/** Generates a deterministic plan from a fixed set of questionnaire
 *  answers — same answers always produce the same plan. */
export function generateMentorPlan(answers: MentorAnswers): MentorPlan {
  const structure = STRUCTURE_BY_DAYS[answers.days];
  const allowedEquipment = EQUIPMENT_ALLOWLIST[answers.equipment];
  const exercisesPerDay = EXERCISES_PER_DAY_BY_DURATION[answers.duration];
  const setsPerExercise = SETS_BY_EXPERIENCE[answers.experience];
  const repRanges = REP_RANGE_BY_GOAL[answers.goal];
  const avoidExerciseIds = new Set(answers.limitation === "avoid_exercises" ? answers.avoidExerciseIds : []);
  const avoidBodyAreas = new Set(answers.limitation === "avoid_body_areas" ? answers.avoidBodyAreas : []);

  const occurrenceSoFar = new Map<DayType, number>();
  const totalOccurrences = new Map<DayType, number>();
  for (const dt of structure.dayTypes) totalOccurrences.set(dt, (totalOccurrences.get(dt) ?? 0) + 1);

  const days: MentorPlanDay[] = structure.dayTypes.map((dayType) => {
    const slots = DAY_TYPE_SLOTS[dayType].slice(0, exercisesPerDay);
    const usedInThisDay = new Set<string>();
    const exercises: MentorPlanDayExercise[] = [];
    for (const category of slots) {
      const picked = pickExercise(category, allowedEquipment, avoidExerciseIds, avoidBodyAreas, usedInThisDay);
      if (!picked) continue;
      usedInThisDay.add(picked.id);
      const compound = isCompound(category);
      const [minReps, maxReps] = compound ? repRanges.compound : repRanges.isolation;
      exercises.push({
        exerciseId: picked.id,
        displayName: picked.displayName,
        targetSets: setsPerExercise,
        minReps,
        maxReps,
        restSeconds: restSecondsFor(answers.goal, compound),
      });
    }
    const occurrence = (occurrenceSoFar.get(dayType) ?? 0) + 1;
    occurrenceSoFar.set(dayType, occurrence);
    const label = (totalOccurrences.get(dayType) ?? 1) > 1 ? `${DAY_TYPE_LABEL[dayType]} ${occurrence}` : DAY_TYPE_LABEL[dayType];
    return { name: label, exercises };
  });

  return {
    planName: `Mentor Plan — ${structure.name}`,
    structure: structure.name,
    explanation: STRUCTURE_EXPLANATION[answers.days],
    days,
  };
}
