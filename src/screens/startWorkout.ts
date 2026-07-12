import { esc } from "../app/format";
import { listPlans, listWorkoutDays, listDayExercises, type PlanRecord, type WorkoutDayRecord } from "../database/plansRepo";
import { lastPerformedSets, saveDraft, type WorkoutDraft } from "../database/sessionsRepo";
import { getDb } from "../database/db";
import { go } from "../app/router";
import { setSession } from "../app/session";

async function lastRunFor(dayId: string): Promise<string | null> {
  const db = await getDb();
  const res = await db.query("SELECT completed_at FROM workout_sessions WHERE workout_day_id = ? ORDER BY completed_at DESC LIMIT 1", [dayId]);
  return (res.values?.[0] as { completed_at: string } | undefined)?.completed_at ?? null;
}

async function startSessionFromDay(day: WorkoutDayRecord, plan: PlanRecord): Promise<void> {
  const dayExercises = await listDayExercises(day.id);
  const exercises = await Promise.all(
    dayExercises.map(async (de) => {
      const last = await lastPerformedSets(de.exerciseId, day.id);
      const targetSets = de.targetSets ?? 1;
      const sets = last.length ? last : Array.from({ length: Math.max(1, targetSets) }, () => ({ weight: "", reps: "" }));
      const target = de.targetSets && de.minReps && de.maxReps ? `${de.targetSets}×${de.minReps}-${de.maxReps}` : "";
      return {
        exerciseId: de.exerciseId,
        exerciseName: de.exerciseName,
        dayExerciseId: de.id,
        target,
        notes: "",
        sets,
        minReps: de.minReps,
        maxReps: de.maxReps,
        weightIncrement: de.weightIncrement,
      };
    })
  );
  const draft: WorkoutDraft = {
    id: "draft_" + day.id,
    planId: plan.id,
    workoutDayId: day.id,
    templateName: day.name,
    startedAt: new Date().toISOString(),
    notes: "",
    exercises,
  };
  setSession(draft);
  await saveDraft(draft);
  go("session");
}

export async function mount(container: HTMLElement): Promise<void> {
  const plans = await listPlans(false);
  if (!plans.length) {
    container.innerHTML = `<div class="empty" style="margin-top:14px">No plans yet.<br>Head to the Plans tab to build one, or use a starter plan.</div>`;
    return;
  }
  let h = "";
  for (const plan of plans) {
    const days = await listWorkoutDays(plan.id);
    if (!days.length) continue;
    if (plans.length > 1) h += `<div class="sectionlabel">${esc(plan.name)}</div>`;
    h += '<div class="grid2" style="margin-top:8px">';
    for (const day of days) {
      const exercises = await listDayExercises(day.id);
      const lastRun = await lastRunFor(day.id);
      h += `<button class="card tplcard" data-day="${esc(day.id)}" data-plan="${esc(plan.id)}">
        <span class="display name">${esc(day.name)}</span>
        <span class="meta">${exercises.length} lifts${lastRun ? ` · last ${new Date(lastRun).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}</span>
        <span class="go">Start <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg></span></button>`;
    }
    h += "</div>";
  }
  if (!h) {
    container.innerHTML = `<div class="empty" style="margin-top:14px">Your plan has no workout days yet.<br>Add one from the Plans tab.</div>`;
    return;
  }
  container.innerHTML = h;
  container.querySelectorAll<HTMLButtonElement>("[data-day]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const plan = plans.find((p) => p.id === btn.dataset.plan)!;
      const days = await listWorkoutDays(plan.id);
      const day = days.find((d) => d.id === btn.dataset.day)!;
      await startSessionFromDay(day, plan);
    });
  });
}
