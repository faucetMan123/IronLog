import { esc, fmtDate } from "../app/format";
import { allPRs } from "../database/sessionsRepo";

export async function mount(container: HTMLElement): Promise<void> {
  const prs = await allPRs();
  if (!prs.length) {
    container.innerHTML = '<div class="empty" style="margin-top:14px">Personal records appear here automatically<br>once you start logging workouts.</div>';
    return;
  }
  let h = '<div class="card" style="padding:6px 15px;margin-top:4px">';
  prs.forEach((p, i) => {
    h += `<div class="prs-row${i ? " prs-row-line" : ""}">
      <span><span class="prs-name">${esc(p.exerciseName)}</span><span class="prs-date dimtext">${fmtDate(p.date)}</span></span>
      <span class="prs-val mono">${p.weight > 0 ? p.weight + "kg" : "BW"} <span class="prs-reps">× ${p.reps}</span></span>
    </div>`;
  });
  container.innerHTML = h + "</div>";
}
