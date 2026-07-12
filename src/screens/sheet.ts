import { esc, fmtDT, toast } from "../app/format";
import { modalConfirm } from "../components/modal";
import { listHistory, getSessionDetail, deleteSession } from "../database/sessionsRepo";

const TRASH_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/></svg>`;

async function handleDelete(id: string, templateName: string, completedAt: string, rerender: () => void): Promise<void> {
  const ok = await modalConfirm("Delete workout?", `${templateName} on ${fmtDT(completedAt)} will be permanently removed.`, "Delete", true);
  if (!ok) return;
  await deleteSession(id);
  rerender();
  toast("Workout deleted");
}

export async function mount(container: HTMLElement): Promise<void> {
  const rerender = () => void mount(container);
  const history = await listHistory();
  if (!history.length) {
    container.innerHTML = '<div class="empty" style="margin-top:14px">No workouts logged yet.<br>Start a session from the home screen and it will appear here.</div>';
    return;
  }
  let h = '<div style="margin-top:8px">';
  for (const summary of history) {
    const detail = await getSessionDetail(summary.id);
    if (!detail) continue;
    h += `<div class="wblock"><div class="whead">
      <div><b style="font-size:13.5px">${esc(detail.templateName)}</b>
      <span class="dimtext" style="margin-left:8px">${fmtDT(detail.completedAt)}</span></div>
      <button class="iconbtn" aria-label="Delete workout" data-del="${esc(detail.id)}" data-tpl="${esc(detail.templateName)}" data-date="${esc(detail.completedAt)}">${TRASH_ICON}</button></div>
      <table><tbody>`;
    for (const e of detail.exercises) {
      e.sets.forEach((s, si) => {
        h += "<tr>";
        if (si === 0) h += `<td rowspan="${e.sets.length}" style="width:40%;vertical-align:top;font-weight:600">${esc(e.exerciseName)}</td>`;
        h += `<td class="mono dimtext" style="width:18%">${si + 1}</td>
            <td class="mono" style="width:21%">${esc(s.weight)}kg</td>
            <td class="mono" style="width:21%">${esc(s.reps)}</td></tr>`;
      });
    }
    h += "</tbody></table></div>";
  }
  container.innerHTML = h + "</div>";
  container.querySelectorAll<HTMLButtonElement>("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => void handleDelete(btn.dataset.del!, btn.dataset.tpl!, btn.dataset.date!, rerender));
  });
}
