import { esc, toast, fmtDT } from "../app/format";
import { getSession, setSession } from "../app/session";
import { modalConfirm } from "../components/modal";
import { pickExercise } from "../components/exercisePicker";
import { go } from "../app/router";
import { saveDraft, finishSession, clearDraft, type DraftSet } from "../database/sessionsRepo";
import { suggestProgression } from "../workouts/progression";

let elapsedTimer: ReturnType<typeof setInterval> | undefined;
let finishing = false;
let saveDebounce: ReturnType<typeof setTimeout> | undefined;

function setDone(e: { sets: DraftSet[] }): number {
  return e.sets.filter((s) => String(s.weight).trim() !== "" && String(s.reps).trim() !== "").length;
}

function scheduleSave(): void {
  clearTimeout(saveDebounce);
  saveDebounce = setTimeout(() => {
    const s = getSession();
    if (s) void saveDraft(s);
  }, 400);
}

/** Must be called before finishing/discarding: otherwise a pending
 *  debounced autosave can fire AFTER finishSession()/clearDraft() has
 *  already deleted the draft row, silently re-inserting (resurrecting) it
 *  since saveDraft() is an INSERT OR REPLACE keyed by the singleton id. */
function cancelScheduledSave(): void {
  clearTimeout(saveDebounce);
  saveDebounce = undefined;
}

function formatElapsed(startedAt: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function mount(container: HTMLElement): void {
  clearInterval(elapsedTimer);
  finishing = false;
  const session = getSession();
  if (!session) return;

  let h = `<div style="margin-top:2px">
    <div class="dimtext mono" id="elapsedTimer" style="text-align:center;margin-bottom:10px;font-size:13px">${formatElapsed(session.startedAt)}</div>`;

  session.exercises.forEach((e, ei) => {
    const done = setDone(e);
    const plates = e.sets.map((_, i) => `<div class="plate ${i < done ? "done" : ""}"></div>`).join("");
    const suggestion = suggestProgression({
      minReps: e.minReps ?? null,
      maxReps: e.maxReps ?? null,
      weightIncrement: e.weightIncrement ?? 2.5,
      lastSets: e.sets.filter((s) => s.weight && s.reps).map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 })),
    });
    h += `<div class="card" style="margin-bottom:13px" data-exercise="${ei}">
      <div class="exhead">
        <span class="exname">${esc(e.exerciseName)}${e.target ? `<span class="extarget mono">${esc(e.target)}</span>` : ""}</span>
        <div class="plates">${plates}</div></div>
      ${suggestion.kind !== "none" ? `<div class="pr-note" style="margin:0 0 10px">${esc(suggestion.message)}</div>` : ""}
      <div class="setrow sethead"><span>#</span><span>Weight (kg)</span><span>Reps</span><span></span></div>`;
    e.sets.forEach((s, si) => {
      h += `<div class="setrow">
        <span class="mono dimtext" style="text-align:center">${si + 1}</span>
        <input class="mono" type="number" inputmode="decimal" placeholder="0" value="${esc(s.weight)}"
          data-field="weight" data-ei="${ei}" data-si="${si}">
        <input class="mono" type="number" inputmode="numeric" placeholder="0" value="${esc(s.reps)}"
          data-field="reps" data-ei="${ei}" data-si="${si}">
        <button class="iconbtn" aria-label="Remove set" data-action="rmSet" data-ei="${ei}" data-si="${si}">✕</button></div>`;
    });
    h += `<div class="flexrow" style="margin-top:7px">
        <button class="btn btn-small" data-action="addSet" data-ei="${ei}">+ Add set</button>
        <button class="btn btn-small btn-ghost" data-action="substitute" data-ei="${ei}">Substitute</button>
      </div>
      <textarea placeholder="Notes for this exercise (optional)" data-action="exNotes" data-ei="${ei}" style="margin-top:8px;min-height:40px;font-size:13px">${esc(e.notes)}</textarea>
    </div>`;
  });

  h += `<button class="btn btn-ghost" style="border-style:dashed;margin-bottom:12px" data-action="addExercise">+ Add exercise for this session</button>
    <textarea placeholder="Workout notes (optional)" id="workoutNotes" style="margin-bottom:8px;min-height:50px">${esc(session.notes)}</textarea>
    <div style="height:74px"></div></div>
    <div id="sessionBar">
      <button class="btn btn-ghost" style="flex:1;background:var(--surface);border-color:var(--border-solid)" data-action="discard">Discard</button>
      <button class="btn btn-primary" style="flex:2" data-action="finish">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 12l5 5L20 7"/></svg>
        Finish Workout</button>
    </div>`;
  container.innerHTML = h;

  elapsedTimer = setInterval(() => {
    const el = document.getElementById("elapsedTimer");
    const s = getSession();
    if (el && s) el.textContent = formatElapsed(s.startedAt);
  }, 1000);

  container.querySelectorAll<HTMLInputElement>("input[data-field]").forEach((input) => {
    input.addEventListener("focus", () => input.select());
    input.addEventListener("input", () => {
      const ei = Number(input.dataset.ei);
      const si = Number(input.dataset.si);
      const field = input.dataset.field as "weight" | "reps";
      const s = getSession();
      if (!s) return;
      s.exercises[ei].sets[si][field] = input.value;
      const cards = container.querySelectorAll(".card[data-exercise]");
      const e = s.exercises[ei];
      const done = setDone(e);
      const plates = cards[ei]?.querySelectorAll(".plate");
      plates?.forEach((p, i) => p.classList.toggle("done", i < done));
      scheduleSave();
    });
  });

  container.querySelectorAll<HTMLTextAreaElement>("[data-action='exNotes']").forEach((ta) => {
    ta.addEventListener("input", () => {
      const s = getSession();
      if (!s) return;
      s.exercises[Number(ta.dataset.ei)].notes = ta.value;
      scheduleSave();
    });
  });

  container.querySelector<HTMLTextAreaElement>("#workoutNotes")?.addEventListener("input", (e) => {
    const s = getSession();
    if (!s) return;
    s.notes = (e.target as HTMLTextAreaElement).value;
    scheduleSave();
  });

  container.querySelectorAll<HTMLButtonElement>("[data-action='rmSet']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = getSession();
      if (!s) return;
      const ei = Number(btn.dataset.ei);
      const si = Number(btn.dataset.si);
      const sets = s.exercises[ei].sets;
      sets.splice(si, 1);
      if (!sets.length) sets.push({ weight: "", reps: "" });
      scheduleSave();
      mount(container);
    });
  });

  container.querySelectorAll<HTMLButtonElement>("[data-action='addSet']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = getSession();
      if (!s) return;
      const ei = Number(btn.dataset.ei);
      const sets = s.exercises[ei].sets;
      const last = sets[sets.length - 1] || { weight: "", reps: "" };
      sets.push({ weight: last.weight, reps: last.reps });
      scheduleSave();
      mount(container);
    });
  });

  container.querySelectorAll<HTMLButtonElement>("[data-action='substitute']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const picked = await pickExercise("Substitute exercise");
      if (!picked) return;
      const s = getSession();
      if (!s) return;
      const ei = Number(btn.dataset.ei);
      s.exercises[ei].exerciseId = picked.id;
      s.exercises[ei].exerciseName = picked.displayName;
      s.exercises[ei].dayExerciseId = null;
      s.exercises[ei].minReps = null;
      s.exercises[ei].maxReps = null;
      scheduleSave();
      mount(container);
    });
  });

  container.querySelector("[data-action='addExercise']")?.addEventListener("click", async () => {
    const picked = await pickExercise("Add exercise");
    if (!picked) return;
    const s = getSession();
    if (!s) return;
    s.exercises.push({ exerciseId: picked.id, exerciseName: picked.displayName, dayExerciseId: null, target: "", notes: "", sets: [{ weight: "", reps: "" }] });
    scheduleSave();
    mount(container);
  });

  container.querySelector("[data-action='discard']")?.addEventListener("click", async () => {
    const ok = await modalConfirm("Discard workout?", "Nothing from this session will be saved.", "Discard", true);
    if (ok) {
      cancelScheduledSave();
      await clearDraft();
      setSession(null);
      clearInterval(elapsedTimer);
      go("home");
    }
  });

  container.querySelector("[data-action='finish']")?.addEventListener("click", async () => {
    if (finishing) return;
    const s = getSession();
    if (!s) return;
    const hasAnySet = s.exercises.some((e) => e.sets.some((set) => String(set.weight).trim() !== "" || String(set.reps).trim() !== ""));
    if (!hasAnySet) {
      toast("Log at least one set first");
      return;
    }
    const ok = await modalConfirm("Finish workout?", `${fmtDT(s.startedAt)} — save this session to your history.`, "Finish");
    if (!ok) return;
    finishing = true;
    cancelScheduledSave();
    const id = await finishSession(s);
    finishing = false;
    if (!id) {
      toast("Log at least one set first");
      return;
    }
    const nm = s.templateName;
    setSession(null);
    clearInterval(elapsedTimer);
    go("home");
    toast(nm + " saved");
  });
}
