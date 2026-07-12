import { store, save } from "../app/store";
import { esc, toast, uid } from "../app/format";
import { modalConfirm } from "../components/modal";
import { DEFAULT_TEMPLATES } from "../workouts/templates";

let openTpl: string | null = null;

async function resetTemplates(rerender: () => void): Promise<void> {
  const ok = await modalConfirm("Reset templates?", "All six templates return to your built-in programme. Workout history is not affected.", "Reset");
  if (!ok) return;
  store.data.templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
  save();
  rerender();
  toast("Templates reset");
}

async function rmEx(tid: string, eid: string, rerender: () => void): Promise<void> {
  const t = store.data.templates.find((x) => x.id === tid);
  if (!t) return;
  const e = t.exercises.find((x) => x.id === eid);
  const ok = await modalConfirm("Remove exercise?", `"${e ? e.name : ""}" will be removed from ${t.name}. Past workouts keep it.`, "Remove", true);
  if (!ok) return;
  t.exercises = t.exercises.filter((x) => x.id !== eid);
  save();
  rerender();
}

function addEx(tid: string, rerender: () => void): void {
  const t = store.data.templates.find((x) => x.id === tid);
  if (t) {
    t.exercises.push({ id: uid(), name: "New Exercise", sets: 3, reps: "" });
    save();
    rerender();
  }
}

export function mount(container: HTMLElement): void {
  const rerender = () => mount(container);
  let h = '<div style="margin-top:8px">';
  for (const t of store.data.templates) {
    const open = openTpl === t.id;
    h += `<div class="card" style="padding:0;margin-bottom:10px;overflow:hidden">
      <button style="width:100%;background:none;border:none;color:var(--text);padding:14px 15px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14.5px;font-weight:700;min-height:50px"
        data-toggle="${t.id}">
        <span>${esc(t.name)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="transition:transform 0.2s;transform:rotate(${open ? 90 : 0}deg);color:var(--text-faint)"><path d="M9 5l7 7-7 7"/></svg></button>`;
    if (open) {
      h += `<div style="padding:0 15px 15px">
        <input value="${esc(t.name)}" data-tplname="${t.id}" style="margin-bottom:12px" placeholder="Template name">
        <div style="display:grid;grid-template-columns:1fr 52px 74px 34px;gap:7px;margin-bottom:5px" class="sethead"><span>Exercise</span><span>Sets</span><span>Reps</span><span></span></div>`;
      t.exercises.forEach((e) => {
        h += `<div style="display:grid;grid-template-columns:1fr 52px 74px 34px;gap:7px;margin-bottom:7px;align-items:center">
          <input value="${esc(e.name)}" data-exfield="name" data-tid="${t.id}" data-eid="${e.id}">
          <input class="mono" type="number" inputmode="numeric" value="${esc(e.sets || "")}" data-exfield="sets" data-tid="${t.id}" data-eid="${e.id}">
          <input class="mono" value="${esc(e.reps || "")}" placeholder="8–12" data-exfield="reps" data-tid="${t.id}" data-eid="${e.id}">
          <button class="iconbtn" aria-label="Remove exercise" data-rmex="${t.id}|${e.id}">✕</button></div>`;
      });
      h += `<button class="btn btn-small" style="margin-top:5px" data-addex="${t.id}">+ Add exercise</button></div>`;
    }
    h += "</div>";
  }
  h += `<button class="btn btn-ghost" style="margin-top:14px" id="resetTplBtn">Reset templates to programme defaults</button>
    <div class="dimtext" style="margin:14px 0 4px;text-align:center;line-height:1.5">Changes save automatically.<br>Reset only replaces templates — workout history is untouched.</div>
    </div>`;
  container.innerHTML = h;

  container.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.toggle!;
      openTpl = openTpl === id ? null : id;
      rerender();
    });
  });
  container.querySelectorAll<HTMLInputElement>("[data-tplname]").forEach((input) => {
    input.addEventListener("input", () => {
      const t = store.data.templates.find((x) => x.id === input.dataset.tplname);
      if (t) {
        t.name = input.value;
        save();
      }
    });
  });
  container.querySelectorAll<HTMLInputElement>("[data-exfield]").forEach((input) => {
    input.addEventListener("input", () => {
      const t = store.data.templates.find((x) => x.id === input.dataset.tid);
      const e = t?.exercises.find((x) => x.id === input.dataset.eid);
      if (e) {
        const field = input.dataset.exfield as "name" | "sets" | "reps";
        if (field === "sets") e.sets = parseInt(input.value) || "";
        else e[field] = input.value;
        save();
      }
    });
  });
  container.querySelectorAll<HTMLButtonElement>("[data-rmex]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [tid, eid] = btn.dataset.rmex!.split("|");
      void rmEx(tid, eid, rerender);
    });
  });
  container.querySelectorAll<HTMLButtonElement>("[data-addex]").forEach((btn) => {
    btn.addEventListener("click", () => addEx(btn.dataset.addex!, rerender));
  });
  container.querySelector("#resetTplBtn")?.addEventListener("click", () => void resetTemplates(rerender));
}
