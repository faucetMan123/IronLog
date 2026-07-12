import { esc, toast } from "../app/format";
import { go } from "../app/router";
import { STARTER_PLANS } from "../plans/starterPlans";
import { createPlanFromSpec } from "../plans/createPlanFromSpec";
import { markOnboardingCompleted } from "../database/settingsRepo";

export function mount(container: HTMLElement): void {
  let h = '<div style="margin-top:6px;display:flex;flex-direction:column;gap:13px">';
  STARTER_PLANS.forEach((plan, i) => {
    h += `<button class="card progress-option" data-plan="${i}">
      <div style="flex:1;text-align:left">
        <div class="display" style="font-size:16px">${esc(plan.planName)}</div>
        <div class="dimtext" style="margin-top:4px;line-height:1.4">${esc(plan.explanation)}</div>
        <div class="dimtext mono" style="margin-top:6px;font-size:11px">${plan.days.length} days/week</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="color:var(--text-faint)"><path d="M9 5l7 7-7 7"/></svg>
    </button>`;
  });
  h += "</div>";
  container.innerHTML = h;

  container.querySelectorAll<HTMLButtonElement>("[data-plan]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const spec = STARTER_PLANS[Number(btn.dataset.plan)];
      await createPlanFromSpec(spec);
      await markOnboardingCompleted();
      toast(`${spec.planName} added`);
      go("home", undefined, true);
    });
  });
}
