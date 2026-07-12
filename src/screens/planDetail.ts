import { esc } from "../app/format";
import { modalConfirm, modalPrompt } from "../components/modal";
import { pickExercise } from "../components/exercisePicker";
import {
  getPlan,
  renamePlan,
  listWorkoutDays,
  createWorkoutDay,
  renameWorkoutDay,
  reorderWorkoutDays,
  duplicateWorkoutDay,
  deleteWorkoutDay,
  listDayExercises,
  addDayExercise,
  updateDayExercise,
  removeDayExercise,
  reorderDayExercises,
  type DayExerciseRecord,
} from "../database/plansRepo";

let openDayId: string | null = null;

async function move<T extends { id: string }>(items: T[], id: string, dir: -1 | 1, apply: (orderedIds: string[]) => Promise<void>): Promise<void> {
  const idx = items.findIndex((i) => i.id === id);
  const swapWith = idx + dir;
  if (idx < 0 || swapWith < 0 || swapWith >= items.length) return;
  const ids = items.map((i) => i.id);
  [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
  await apply(ids);
}

export async function mount(container: HTMLElement, planId: string | undefined): Promise<void> {
  const rerender = () => void mount(container, planId);
  if (!planId) {
    container.innerHTML = '<div class="empty">Plan not found.</div>';
    return;
  }
  const plan = await getPlan(planId);
  if (!plan) {
    container.innerHTML = '<div class="empty">This plan no longer exists.</div>';
    return;
  }
  const days = await listWorkoutDays(planId);

  let h = `<div style="margin-top:4px">
    <input value="${esc(plan.name)}" id="planNameInput" style="margin-bottom:14px;font-weight:700" placeholder="Plan name">`;

  let openDayExercises: DayExerciseRecord[] = [];
  for (const day of days) {
    const open = openDayId === day.id;
    h += `<div class="card" style="padding:0;margin-bottom:10px;overflow:hidden">
      <button style="width:100%;background:none;border:none;color:var(--text);padding:14px 15px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14.5px;font-weight:700;min-height:50px"
        data-toggle="${day.id}">
        <span>${esc(day.name)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="transition:transform 0.2s;transform:rotate(${open ? 90 : 0}deg);color:var(--text-faint)"><path d="M9 5l7 7-7 7"/></svg></button>`;
    if (open) {
      const exercises = await listDayExercises(day.id);
      openDayExercises = exercises;
      h += `<div style="padding:0 15px 15px">
        <input value="${esc(day.name)}" data-dayname="${day.id}" style="margin-bottom:10px" placeholder="Day name">
        <div class="flexrow" style="margin-bottom:12px">
          <button class="btn btn-small" data-day-up="${day.id}">↑ Move up</button>
          <button class="btn btn-small" data-day-down="${day.id}">↓ Move down</button>
          <button class="btn btn-small" data-day-dup="${day.id}">Duplicate</button>
          <button class="btn btn-small btn-danger" data-day-del="${day.id}">Delete</button>
        </div>`;
      if (exercises.length) {
        h += `<div style="display:grid;grid-template-columns:1fr 44px 62px auto;gap:6px;margin-bottom:6px" class="sethead"><span>Exercise</span><span>Sets</span><span>Reps</span><span></span></div>`;
        for (const de of exercises) {
          h += renderExerciseRow(de);
        }
      }
      h += `<button class="btn btn-small" style="margin-top:5px" data-add-ex="${day.id}">+ Add exercise</button></div>`;
    }
    h += "</div>";
  }
  h += `<button class="btn btn-ghost" style="margin-top:4px;border-style:dashed" id="addDayBtn">+ Add workout day</button>
    </div>`;
  container.innerHTML = h;

  container.querySelector("#planNameInput")?.addEventListener("change", async (e) => {
    await renamePlan(planId, (e.target as HTMLInputElement).value);
  });

  container.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openDayId = openDayId === btn.dataset.toggle ? null : btn.dataset.toggle!;
      rerender();
    });
  });
  container.querySelectorAll<HTMLInputElement>("[data-dayname]").forEach((input) => {
    input.addEventListener("change", () => void renameWorkoutDay(input.dataset.dayname!, input.value).then(rerender));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-day-up]").forEach((btn) => {
    btn.addEventListener("click", () => void move(days, btn.dataset.dayUp!, -1, reorderWorkoutDays).then(rerender));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-day-down]").forEach((btn) => {
    btn.addEventListener("click", () => void move(days, btn.dataset.dayDown!, 1, reorderWorkoutDays).then(rerender));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-day-dup]").forEach((btn) => {
    btn.addEventListener("click", () => void duplicateWorkoutDay(btn.dataset.dayDup!).then(() => rerender()));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-day-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await modalConfirm("Delete workout day?", "This day will be removed from the plan. Completed workout history is not affected.", "Delete", true);
      if (!ok) return;
      await deleteWorkoutDay(btn.dataset.dayDel!);
      openDayId = null;
      rerender();
    });
  });
  container.querySelectorAll<HTMLButtonElement>("[data-add-ex]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const picked = await pickExercise("Add exercise");
      if (!picked) return;
      await addDayExercise(btn.dataset.addEx!, picked.id, { targetSets: 3, minReps: 8, maxReps: 12, restSeconds: 90 });
      rerender();
    });
  });
  container.querySelector("#addDayBtn")?.addEventListener("click", async () => {
    const name = await modalPrompt("New workout day", "e.g. Push Day");
    if (!name || !name.trim()) return;
    const day = await createWorkoutDay(planId, name.trim());
    openDayId = day.id;
    rerender();
  });

  wireExerciseRows(container, openDayExercises, rerender);
}

function renderExerciseRow(de: DayExerciseRecord): string {
  return `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #14254433" data-ex-row="${de.id}">
    <div style="display:grid;grid-template-columns:1fr 44px 62px auto;gap:6px;align-items:center;margin-bottom:6px">
      <span style="font-size:13px;font-weight:600">${esc(de.exerciseName)}</span>
      <input class="mono" type="number" inputmode="numeric" value="${de.targetSets ?? ""}" data-ex-field="targetSets" data-ex-id="${de.id}">
      <input class="mono" placeholder="8-12" value="${de.minReps && de.maxReps ? `${de.minReps}-${de.maxReps}` : ""}" data-ex-field="repRange" data-ex-id="${de.id}">
      <span style="display:flex;gap:2px">
        <button class="iconbtn" aria-label="Move exercise up" data-ex-up="${de.id}" style="width:28px;height:28px">↑</button>
        <button class="iconbtn" aria-label="Move exercise down" data-ex-down="${de.id}" style="width:28px;height:28px">↓</button>
        <button class="iconbtn" aria-label="Remove exercise" data-rm-ex="${de.id}" style="width:28px;height:28px">✕</button>
      </span>
    </div>
    <div style="display:grid;grid-template-columns:70px 70px 1fr;gap:6px">
      <input class="mono" type="number" inputmode="decimal" placeholder="Rest s" value="${de.restSeconds ?? ""}" data-ex-field="restSeconds" data-ex-id="${de.id}" style="font-size:12px;padding:8px">
      <input class="mono" type="number" inputmode="decimal" placeholder="+kg" value="${de.weightIncrement ?? ""}" data-ex-field="weightIncrement" data-ex-id="${de.id}" style="font-size:12px;padding:8px">
      <input placeholder="Notes" value="${esc(de.notes ?? "")}" data-ex-field="notes" data-ex-id="${de.id}" style="font-size:12px;padding:8px">
    </div>
  </div>`;
}

function wireExerciseRows(container: HTMLElement, exercises: DayExerciseRecord[], rerender: () => void): void {
  container.querySelectorAll<HTMLInputElement>("[data-ex-field='targetSets']").forEach((input) => {
    input.addEventListener("change", () => void updateDayExercise(input.dataset.exId!, { targetSets: parseInt(input.value) || null }));
  });
  container.querySelectorAll<HTMLInputElement>("[data-ex-field='repRange']").forEach((input) => {
    input.addEventListener("change", () => {
      const m = /^(\d+)\s*-\s*(\d+)$/.exec(input.value.trim());
      void updateDayExercise(input.dataset.exId!, { minReps: m ? parseInt(m[1]) : null, maxReps: m ? parseInt(m[2]) : null });
    });
  });
  container.querySelectorAll<HTMLInputElement>("[data-ex-field='restSeconds']").forEach((input) => {
    input.addEventListener("change", () => void updateDayExercise(input.dataset.exId!, { restSeconds: parseInt(input.value) || null }));
  });
  container.querySelectorAll<HTMLInputElement>("[data-ex-field='weightIncrement']").forEach((input) => {
    input.addEventListener("change", () => void updateDayExercise(input.dataset.exId!, { weightIncrement: parseFloat(input.value) || null }));
  });
  container.querySelectorAll<HTMLInputElement>("[data-ex-field='notes']").forEach((input) => {
    input.addEventListener("change", () => void updateDayExercise(input.dataset.exId!, { notes: input.value.trim() || null }));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-ex-up]").forEach((btn) => {
    btn.addEventListener("click", () => void move(exercises, btn.dataset.exUp!, -1, reorderDayExercises).then(rerender));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-ex-down]").forEach((btn) => {
    btn.addEventListener("click", () => void move(exercises, btn.dataset.exDown!, 1, reorderDayExercises).then(rerender));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-rm-ex]").forEach((btn) => {
    btn.addEventListener("click", () => void removeDayExercise(btn.dataset.rmEx!).then(rerender));
  });
}
