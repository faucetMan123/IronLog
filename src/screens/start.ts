import { store } from "../app/store";
import { esc, fmtDate } from "../app/format";
import { lastSets } from "../workouts/autofill";
import { go } from "../app/router";
import { setSession } from "../app/session";
import type { Session } from "../app/types";

export function startSession(templateId: string): void {
  const t = store.data.templates.find((x) => x.id === templateId);
  if (!t) return;
  const session: Session = {
    templateId: t.id,
    templateName: t.name,
    entries: t.exercises.map((ex) => {
      const last = lastSets(store.data, ex.name, t.id);
      const target = Math.max(1, parseInt(String(ex.sets)) || 1);
      const sets = last.length ? last : Array.from({ length: target }, () => ({ weight: "", reps: "" }));
      return {
        exerciseName: ex.name,
        target: ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : "",
        repHint: ex.reps || "",
        sets,
      };
    }),
  };
  setSession(session);
  go("session");
}

export function mount(container: HTMLElement): void {
  let h = '<div class="grid2" style="margin-top:8px">';
  for (const t of store.data.templates) {
    const lastRun = [...store.data.workouts].reverse().find((w) => w.templateId === t.id);
    h += `<button class="card tplcard" data-tpl="${esc(t.id)}">
      <span class="display name">${esc(t.name)}</span>
      <span class="meta">${t.exercises.length} lifts${lastRun ? ` · last ${fmtDate(lastRun.date)}` : ""}</span>
      <span class="go">Start <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg></span></button>`;
  }
  h += "</div>";
  container.innerHTML = h;
  container.querySelectorAll<HTMLButtonElement>("[data-tpl]").forEach((btn) => {
    btn.addEventListener("click", () => startSession(btn.dataset.tpl!));
  });
}
