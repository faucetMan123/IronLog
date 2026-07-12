import { esc, toast } from "../app/format";
import { go } from "../app/router";
import { getMentorPlan, clearMentorResult } from "../mentor/state";
import { createPlanFromSpec } from "../plans/createPlanFromSpec";
import { markOnboardingCompleted } from "../database/settingsRepo";

export function mount(container: HTMLElement): void {
  const plan = getMentorPlan();
  if (!plan) {
    container.innerHTML = '<div class="empty">No plan generated yet.</div>';
    return;
  }

  let h = `<div style="margin-top:4px">
    <div class="card" style="margin-bottom:14px">
      <div class="display" style="font-size:16px;margin-bottom:6px">${esc(plan.structure)}</div>
      <div class="dimtext" style="line-height:1.5">${esc(plan.explanation)}</div>
    </div>`;
  for (const day of plan.days) {
    h += `<div class="wblock"><div class="whead"><b style="font-size:13.5px">${esc(day.name)}</b></div><table><tbody>`;
    for (const ex of day.exercises) {
      h += `<tr><td style="width:52%;font-weight:600">${esc(ex.displayName)}</td>
        <td class="mono dimtext" style="width:24%">${ex.targetSets} sets</td>
        <td class="mono" style="width:24%">${ex.minReps}-${ex.maxReps}</td></tr>`;
    }
    h += "</tbody></table></div>";
  }
  h += `<div class="flexrow" style="margin-top:16px">
      <button class="btn btn-ghost" id="abandonBtn">Abandon</button>
      <button class="btn btn-ghost" id="regenerateBtn">Change Answers</button>
    </div>
    <div class="flexrow" style="margin-top:10px">
      <button class="btn" id="modifyBtn">Accept &amp; Modify</button>
      <button class="btn btn-primary" id="acceptBtn">Accept Plan</button>
    </div>
  </div>`;
  container.innerHTML = h;

  container.querySelector("#abandonBtn")?.addEventListener("click", () => {
    clearMentorResult();
    go("onboarding", undefined, true);
  });
  container.querySelector("#regenerateBtn")?.addEventListener("click", () => go("mentorQuestionnaire", undefined, true));
  container.querySelector("#acceptBtn")?.addEventListener("click", async () => {
    await createPlanFromSpec(plan);
    await markOnboardingCompleted();
    clearMentorResult();
    toast("Plan created");
    go("home", undefined, true);
  });
  container.querySelector("#modifyBtn")?.addEventListener("click", async () => {
    const created = await createPlanFromSpec(plan);
    await markOnboardingCompleted();
    clearMentorResult();
    go("planDetail", { planId: created.id }, true);
  });
}
