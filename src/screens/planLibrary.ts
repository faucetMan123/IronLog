import { esc, toast } from "../app/format";
import { modalConfirm, modalPrompt } from "../components/modal";
import { listPlans, createPlan, renamePlan, setPlanArchived, deletePlan, duplicatePlan, listWorkoutDays, createWorkoutDay, type PlanRecord } from "../database/plansRepo";
import { isRirEnabled, setRirEnabled, isRestTimerEnabled, setRestTimerEnabled } from "../database/settingsRepo";
import { go } from "../app/router";

async function handleCreate(): Promise<void> {
  const name = await modalPrompt("New plan", "e.g. My Programme");
  if (!name || !name.trim()) return;
  const plan = await createPlan(name.trim());
  await createWorkoutDay(plan.id, "Day 1");
  // Navigating away — no need to (and must not) also re-render this
  // screen: an in-flight rerender() here can resolve after planDetail's
  // render and clobber #content with stale planLibrary HTML (its query
  // set is larger, so it's not even reliably the slower one to finish).
  go("planDetail", { planId: plan.id });
}

async function handleRename(plan: PlanRecord, rerender: () => void): Promise<void> {
  const name = await modalPrompt("Rename plan", plan.name);
  if (!name || !name.trim()) return;
  await renamePlan(plan.id, name.trim());
  rerender();
}

async function handleDuplicate(plan: PlanRecord, rerender: () => void): Promise<void> {
  await duplicatePlan(plan.id);
  rerender();
  toast("Plan duplicated");
}

async function handleArchive(plan: PlanRecord, archived: boolean, rerender: () => void): Promise<void> {
  await setPlanArchived(plan.id, archived);
  rerender();
  toast(archived ? "Plan archived" : "Plan restored");
}

async function handleDelete(plan: PlanRecord, rerender: () => void): Promise<void> {
  const ok = await modalConfirm("Delete plan?", `"${plan.name}" and its workout days will be removed. Your completed workout history is NEVER deleted and stays in Log/PR/Progress.`, "Delete", true);
  if (!ok) return;
  await deletePlan(plan.id);
  rerender();
  toast("Plan deleted");
}

export async function mount(container: HTMLElement): Promise<void> {
  const rerender = () => void mount(container);
  const [active, archived, rir, restTimerOn] = await Promise.all([
    listPlans(false),
    listPlans(true).then((all) => all.filter((p) => p.archived)),
    isRirEnabled(),
    isRestTimerEnabled(),
  ]);

  let h = `<div class="settings-card card" style="margin-top:8px;margin-bottom:14px">
    <div class="settings-title">Workout preferences</div>
    <div class="dimtext" style="margin-bottom:10px">Both are off by default and only affect what's shown while logging a workout.</div>
    <div class="togglerow" style="margin-bottom:8px">
      <button class="toggle ${rir ? "active" : ""}" id="rirToggle">RIR field</button>
      <button class="toggle ${!rir ? "active" : ""}" id="rirToggleOff">Hide RIR</button>
    </div>
    <div class="togglerow">
      <button class="toggle ${restTimerOn ? "active" : ""}" id="restToggle">Rest timer</button>
      <button class="toggle ${!restTimerOn ? "active" : ""}" id="restToggleOff">Hide rest timer</button>
    </div>
  </div>`;
  if (!active.length && !archived.length) {
    h += '<div class="empty">No plans yet. Create one, or use the Mentor / a starter plan from onboarding again via Import in Data.</div>';
  }
  for (const plan of active) {
    const days = await listWorkoutDays(plan.id);
    h += `<div class="card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <button style="background:none;border:none;color:var(--text);text-align:left;flex:1;cursor:pointer;font-size:14.5px;font-weight:700;padding:4px 0" data-open="${plan.id}">${esc(plan.name)}</button>
      </div>
      <div class="dimtext" style="margin:4px 0 10px">${days.length} workout day${days.length === 1 ? "" : "s"}</div>
      <div class="flexrow">
        <button class="btn btn-small" data-rename="${plan.id}">Rename</button>
        <button class="btn btn-small" data-duplicate="${plan.id}">Duplicate</button>
        <button class="btn btn-small btn-ghost" data-archive="${plan.id}">Archive</button>
      </div>
    </div>`;
  }
  if (archived.length) {
    h += '<div class="sectionlabel">Archived</div>';
    for (const plan of archived) {
      h += `<div class="card" style="margin-bottom:10px;opacity:.7">
        <div style="font-weight:700;font-size:14px">${esc(plan.name)}</div>
        <div class="flexrow" style="margin-top:10px">
          <button class="btn btn-small" data-unarchive="${plan.id}">Restore</button>
          <button class="btn btn-small btn-danger" data-delete="${plan.id}">Delete</button>
        </div>
      </div>`;
    }
  }
  h += `<button class="btn btn-primary" style="margin-top:8px" id="createPlanBtn">+ Create Plan</button>`;
  container.innerHTML = h;

  container.querySelector("#rirToggle")?.addEventListener("click", () => void setRirEnabled(true).then(rerender));
  container.querySelector("#rirToggleOff")?.addEventListener("click", () => void setRirEnabled(false).then(rerender));
  container.querySelector("#restToggle")?.addEventListener("click", () => void setRestTimerEnabled(true).then(rerender));
  container.querySelector("#restToggleOff")?.addEventListener("click", () => void setRestTimerEnabled(false).then(rerender));

  const allPlans = [...active, ...archived];
  container.querySelectorAll<HTMLButtonElement>("[data-open]").forEach((btn) => btn.addEventListener("click", () => go("planDetail", { planId: btn.dataset.open! })));
  container.querySelectorAll<HTMLButtonElement>("[data-rename]").forEach((btn) => {
    const plan = allPlans.find((p) => p.id === btn.dataset.rename)!;
    btn.addEventListener("click", () => void handleRename(plan, rerender));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-duplicate]").forEach((btn) => {
    const plan = allPlans.find((p) => p.id === btn.dataset.duplicate)!;
    btn.addEventListener("click", () => void handleDuplicate(plan, rerender));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-archive]").forEach((btn) => {
    const plan = allPlans.find((p) => p.id === btn.dataset.archive)!;
    btn.addEventListener("click", () => void handleArchive(plan, true, rerender));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-unarchive]").forEach((btn) => {
    const plan = allPlans.find((p) => p.id === btn.dataset.unarchive)!;
    btn.addEventListener("click", () => void handleArchive(plan, false, rerender));
  });
  container.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach((btn) => {
    const plan = allPlans.find((p) => p.id === btn.dataset.delete)!;
    btn.addEventListener("click", () => void handleDelete(plan, rerender));
  });
  container.querySelector("#createPlanBtn")?.addEventListener("click", () => void handleCreate());
}
