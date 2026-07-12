// Shared by both onboarding paths that produce a full plan spec up front
// (Mentor and Starter Plan) — materializes a MentorPlan into real
// plans/workout_days/day_exercises rows.
import type { MentorPlan } from "../mentor/types";
import { createPlan, createWorkoutDay, addDayExercise, type PlanRecord } from "../database/plansRepo";

export async function createPlanFromSpec(spec: MentorPlan): Promise<PlanRecord> {
  const plan = await createPlan(spec.planName);
  for (const day of spec.days) {
    const dayRecord = await createWorkoutDay(plan.id, day.name);
    for (const ex of day.exercises) {
      await addDayExercise(dayRecord.id, ex.exerciseId, {
        targetSets: ex.targetSets,
        minReps: ex.minReps,
        maxReps: ex.maxReps,
        restSeconds: ex.restSeconds,
      });
    }
  }
  return plan;
}
