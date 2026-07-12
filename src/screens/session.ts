import { esc } from "../app/format";
import { getSession, setSession } from "../app/session";
import { store, save, createSnapshot } from "../app/store";
import { modalConfirm, modalPrompt } from "../components/modal";
import { toast } from "../app/format";
import { go } from "../app/router";
import { uid } from "../app/format";

function setDone(e: { sets: { weight: string; reps: string }[] }): number {
  return e.sets.filter((s) => String(s.weight).trim() !== "" && String(s.reps).trim() !== "").length;
}

export function mount(container: HTMLElement): void {
  const session = getSession();
  if (!session) return;

  let h = '<div style="margin-top:6px">';
  session.entries.forEach((e, ei) => {
    const done = setDone(e);
    const plates = e.sets.map((_, i) => `<div class="plate ${i < done ? "done" : ""}"></div>`).join("");
    h += `<div class="card" style="margin-bottom:13px" data-exercise="${ei}">
      <div class="exhead">
        <span class="exname">${esc(e.exerciseName)}${e.target ? `<span class="extarget mono">${esc(e.target)}</span>` : ""}</span>
        <div class="plates">${plates}</div></div>
      <div class="setrow sethead"><span>#</span><span>Weight (kg)</span><span>Reps</span><span></span></div>`;
    e.sets.forEach((s, si) => {
      h += `<div class="setrow">
        <span class="mono dimtext" style="text-align:center">${si + 1}</span>
        <input class="mono" type="number" inputmode="decimal" placeholder="0" value="${esc(s.weight)}"
          data-field="weight" data-ei="${ei}" data-si="${si}">
        <input class="mono" type="number" inputmode="numeric" placeholder="${esc(e.repHint || "0")}" value="${esc(s.reps)}"
          data-field="reps" data-ei="${ei}" data-si="${si}">
        <button class="iconbtn" aria-label="Remove set" data-action="rmSet" data-ei="${ei}" data-si="${si}">✕</button></div>`;
    });
    h += `<button class="btn btn-small" style="margin-top:7px" data-action="addSet" data-ei="${ei}">+ Add set</button></div>`;
  });
  h += `<button class="btn btn-ghost" style="border-style:dashed;margin-bottom:8px" data-action="addExercise">+ Add exercise for this session</button>
    <div style="height:74px"></div></div>
    <div id="sessionBar">
      <button class="btn btn-ghost" style="flex:1;background:var(--surface);border-color:var(--border-solid)" data-action="discard">Discard</button>
      <button class="btn btn-primary" style="flex:2" data-action="finish">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 12l5 5L20 7"/></svg>
        Finish Workout</button>
    </div>`;
  container.innerHTML = h;

  container.querySelectorAll<HTMLInputElement>("input[data-field]").forEach((input) => {
    input.addEventListener("focus", () => input.select());
    input.addEventListener("input", () => {
      const ei = Number(input.dataset.ei);
      const si = Number(input.dataset.si);
      const field = input.dataset.field as "weight" | "reps";
      const s = getSession();
      if (!s) return;
      s.entries[ei].sets[si][field] = input.value;
      const cards = container.querySelectorAll(".card[data-exercise]");
      const e = s.entries[ei];
      const done = setDone(e);
      const plates = cards[ei]?.querySelectorAll(".plate");
      plates?.forEach((p, i) => p.classList.toggle("done", i < done));
    });
  });

  container.querySelectorAll<HTMLButtonElement>("[data-action='rmSet']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = getSession();
      if (!s) return;
      const ei = Number(btn.dataset.ei);
      const si = Number(btn.dataset.si);
      const sets = s.entries[ei].sets;
      sets.splice(si, 1);
      if (!sets.length) sets.push({ weight: "", reps: "" });
      mount(container);
    });
  });

  container.querySelectorAll<HTMLButtonElement>("[data-action='addSet']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = getSession();
      if (!s) return;
      const ei = Number(btn.dataset.ei);
      const sets = s.entries[ei].sets;
      const last = sets[sets.length - 1] || { weight: "", reps: "" };
      sets.push({ weight: last.weight, reps: last.reps });
      mount(container);
    });
  });

  container.querySelector("[data-action='addExercise']")?.addEventListener("click", async () => {
    const name = await modalPrompt("Add exercise", "e.g. Shrugs");
    if (!name || !name.trim()) return;
    const s = getSession();
    if (!s) return;
    s.entries.push({ exerciseName: name.trim(), target: "", repHint: "", sets: [{ weight: "", reps: "" }] });
    mount(container);
  });

  container.querySelector("[data-action='discard']")?.addEventListener("click", async () => {
    const ok = await modalConfirm("Discard workout?", "Nothing from this session will be saved.", "Discard", true);
    if (ok) {
      setSession(null);
      go("home");
    }
  });

  container.querySelector("[data-action='finish']")?.addEventListener("click", () => {
    const s = getSession();
    if (!s) return;
    const entries = s.entries
      .map((e) => ({
        exerciseName: e.exerciseName,
        sets: e.sets.filter((set) => String(set.weight).trim() !== "" || String(set.reps).trim() !== ""),
      }))
      .filter((e) => e.sets.length);
    if (!entries.length) {
      toast("Log at least one set first");
      return;
    }
    store.data.workouts.push({
      id: uid(),
      templateId: s.templateId,
      templateName: s.templateName,
      date: new Date().toISOString(),
      entries,
    });
    save("workout");
    void createSnapshot("workout");
    const nm = s.templateName;
    setSession(null);
    go("home");
    toast(nm + " saved");
  });
}
