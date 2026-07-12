// Shared exercise search/create modal — used by "add exercise" and
// "substitute exercise" during a workout, and by the plan builder. Reuses
// the #modalWrap/#modal DOM nodes directly (not the simpler modalConfirm/
// modalPrompt helpers in components/modal.ts, since this needs live
// re-rendering as the user types).
import { esc } from "../app/format";
import { searchExercises, createCustomExercise, type ExerciseRecord } from "../database/exercisesRepo";

export interface PickedExercise {
  id: string;
  displayName: string;
}

export function pickExercise(title = "Add exercise"): Promise<PickedExercise | null> {
  return new Promise((resolve) => {
    const wrap = document.getElementById("modalWrap");
    const modal = document.getElementById("modal");
    if (!wrap || !modal) {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (val: PickedExercise | null) => {
      if (settled) return;
      settled = true;
      wrap.classList.remove("open");
      wrap.removeEventListener("click", onWrapClick);
      resolve(val);
    };
    const onWrapClick = (e: Event) => {
      if ((e.target as HTMLElement).id === "modalWrap") finish(null);
    };
    wrap.addEventListener("click", onWrapClick);

    let latestRequestId = 0;
    async function renderResults(query: string) {
      const requestId = ++latestRequestId;
      const results: ExerciseRecord[] = await searchExercises(query);
      // A newer query was issued while this one was in flight (e.g. the
      // initial empty-query load racing a fast typed search) — its
      // results are stale, discard them rather than clobbering the
      // correct, more recent results.
      if (requestId !== latestRequestId) return;
      const list = modal!.querySelector("#exPickerResults");
      if (!list) return;
      if (!results.length) {
        list.innerHTML = query.trim()
          ? `<button class="btn btn-small" id="exPickerCreate" style="width:100%">+ Create "${esc(query.trim())}" as a new exercise</button>`
          : `<div class="dimtext" style="padding:8px 2px">Type to search, or add a new exercise.</div>`;
      } else {
        list.innerHTML = results
          .slice(0, 30)
          .map((r) => `<button class="btn btn-ghost btn-small" style="width:100%;justify-content:flex-start;margin-bottom:6px" data-pick="${esc(r.id)}">${esc(r.displayName)}</button>`)
          .join("");
      }
      list.querySelectorAll<HTMLButtonElement>("[data-pick]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const picked = results.find((r) => r.id === btn.dataset.pick);
          if (picked) finish({ id: picked.id, displayName: picked.displayName });
        });
      });
      const createBtn = list.querySelector("#exPickerCreate");
      createBtn?.addEventListener("click", async () => {
        const created = await createCustomExercise(query.trim());
        finish({ id: created.id, displayName: created.displayName });
      });
    }

    modal.innerHTML = `<div class="mtitle">${esc(title)}</div>
      <input id="exPickerInput" placeholder="Search exercises (e.g. RDL, Bench)" autocomplete="off" style="margin-bottom:12px">
      <div id="exPickerResults" style="max-height:260px;overflow-y:auto;margin-bottom:12px"></div>
      <button class="btn btn-ghost" data-modal-cancel="true">Cancel</button>`;
    modal.querySelector("[data-modal-cancel]")?.addEventListener("click", () => finish(null));
    const input = modal.querySelector<HTMLInputElement>("#exPickerInput")!;
    input.addEventListener("input", () => void renderResults(input.value));
    void renderResults("");
    wrap.classList.add("open");
    setTimeout(() => input.focus(), 60);
  });
}
