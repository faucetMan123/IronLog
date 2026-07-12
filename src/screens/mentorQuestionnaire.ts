import { esc } from "../app/format";
import { go } from "../app/router";
import { generateMentorPlan } from "../mentor/rulesEngine";
import { setMentorResult } from "../mentor/state";
import { pickExercise } from "../components/exercisePicker";
import type { MentorAnswers, MentorDays, MentorDuration } from "../mentor/types";
import type { MuscleGroup } from "../database/exerciseLibrary";

const answers: MentorAnswers = {
  goal: "muscle_gain",
  experience: "beginner",
  days: 3,
  equipment: "full_gym",
  duration: 60,
  limitation: "none",
  avoidExerciseIds: [],
  avoidBodyAreas: [],
};
const avoidedExerciseNames = new Map<string, string>();

const GOALS: [MentorAnswers["goal"], string][] = [
  ["muscle_gain", "Muscle Gain"],
  ["strength", "Strength"],
  ["general_fitness", "General Fitness"],
  ["fat_loss_support", "Fat-Loss Support"],
];
const EXPERIENCES: [MentorAnswers["experience"], string][] = [
  ["beginner", "Beginner"],
  ["intermediate", "Intermediate"],
  ["advanced", "Advanced"],
];
const DAY_OPTIONS: MentorDays[] = [2, 3, 4, 5, 6];
const EQUIPMENT: [MentorAnswers["equipment"], string][] = [
  ["full_gym", "Full Gym"],
  ["dumbbells", "Dumbbells"],
  ["basic_home_gym", "Basic Home Gym"],
  ["bodyweight", "Bodyweight"],
];
const DURATIONS: [MentorDuration, string][] = [
  [30, "30 min"],
  [45, "45 min"],
  [60, "60 min"],
  [75, "75+ min"],
];
const LIMITATIONS: [MentorAnswers["limitation"], string][] = [
  ["none", "No limitations"],
  ["avoid_exercises", "Avoid selected exercises"],
  ["avoid_body_areas", "Avoid selected body areas"],
];
const BODY_AREAS: MuscleGroup[] = ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes", "calves", "core"];

function group<T extends string | number>(options: [T, string][], selected: T, dataAttr: string): string {
  return `<div class="context-row" style="grid-template-columns:repeat(${Math.min(options.length, 4)},1fr);flex-wrap:wrap" data-group="${dataAttr}">
    ${options.map(([v, l]) => `<button class="context-btn ${v === selected ? "active" : ""}" data-value="${v}">${esc(l)}</button>`).join("")}
  </div>`;
}

function render(container: HTMLElement): void {
  let h = `<div style="margin-top:4px">
    <div class="sectionlabel">Primary goal</div>
    ${group(GOALS, answers.goal, "goal")}
    <div class="sectionlabel">Experience</div>
    ${group(EXPERIENCES, answers.experience, "experience")}
    <div class="sectionlabel">Training days per week</div>
    ${group(DAY_OPTIONS.map((d) => [d, String(d)] as [MentorDays, string]), answers.days, "days")}
    <div class="sectionlabel">Equipment</div>
    ${group(EQUIPMENT, answers.equipment, "equipment")}
    <div class="sectionlabel">Session duration</div>
    ${group(DURATIONS, answers.duration, "duration")}
    <div class="sectionlabel">Limitations</div>
    ${group(LIMITATIONS, answers.limitation, "limitation")}`;

  if (answers.limitation === "avoid_exercises") {
    h += `<div class="card" style="margin-top:10px">
      <div class="dimtext" style="margin-bottom:8px">Exercises to avoid:</div>
      ${[...avoidedExerciseNames.entries()].map(([id, name]) => `<span class="extarget mono" style="display:inline-flex;align-items:center;gap:6px;margin:0 6px 6px 0">${esc(name)} <button data-rm-avoid="${id}" style="background:none;border:none;color:inherit;cursor:pointer">✕</button></span>`).join("")}
      <button class="btn btn-small" id="addAvoidExBtn" style="margin-top:8px">+ Add exercise</button>
    </div>`;
  } else if (answers.limitation === "avoid_body_areas") {
    h += `<div class="card" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px">
      ${BODY_AREAS.map((a) => `<button class="toggle ${answers.avoidBodyAreas.includes(a) ? "active" : ""}" style="flex:0 0 auto;padding:8px 12px" data-body-area="${a}">${esc(a)}</button>`).join("")}
    </div>`;
  }

  h += `<div class="pr-note" style="margin-top:16px">Not medical advice. If you have an injury or medical condition, consult an appropriate professional before starting a new training programme.</div>
    <button class="btn btn-primary" id="generateBtn" style="margin-top:16px">Generate Plan</button>
  </div>`;
  container.innerHTML = h;

  container.querySelectorAll<HTMLElement>("[data-group]").forEach((groupEl) => {
    const key = groupEl.dataset.group as keyof MentorAnswers;
    groupEl.querySelectorAll<HTMLButtonElement>("[data-value]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const raw = btn.dataset.value!;
        const value = key === "days" || key === "duration" ? Number(raw) : raw;
        (answers as unknown as Record<string, unknown>)[key] = value;
        render(container);
      });
    });
  });

  container.querySelectorAll<HTMLButtonElement>("[data-body-area]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const area = btn.dataset.bodyArea as MuscleGroup;
      const idx = answers.avoidBodyAreas.indexOf(area);
      if (idx >= 0) answers.avoidBodyAreas.splice(idx, 1);
      else answers.avoidBodyAreas.push(area);
      render(container);
    });
  });

  container.querySelector("#addAvoidExBtn")?.addEventListener("click", async () => {
    const picked = await pickExercise("Exercise to avoid");
    if (!picked) return;
    avoidedExerciseNames.set(picked.id, picked.displayName);
    answers.avoidExerciseIds = [...avoidedExerciseNames.keys()];
    render(container);
  });
  container.querySelectorAll<HTMLButtonElement>("[data-rm-avoid]").forEach((btn) => {
    btn.addEventListener("click", () => {
      avoidedExerciseNames.delete(btn.dataset.rmAvoid!);
      answers.avoidExerciseIds = [...avoidedExerciseNames.keys()];
      render(container);
    });
  });

  container.querySelector("#generateBtn")?.addEventListener("click", () => {
    const plan = generateMentorPlan(answers);
    setMentorResult({ ...answers, avoidExerciseIds: [...answers.avoidExerciseIds], avoidBodyAreas: [...answers.avoidBodyAreas] }, plan);
    go("mentorPreview");
  });
}

export function mount(container: HTMLElement): void {
  render(container);
}
