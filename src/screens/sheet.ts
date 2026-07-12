import { store, save } from "../app/store";
import { esc, fmtDT } from "../app/format";
import { modalConfirm } from "../components/modal";
import { toast } from "../app/format";

async function delWorkout(id: string, rerender: () => void): Promise<void> {
  const w = store.data.workouts.find((x) => x.id === id);
  if (!w) return;
  const ok = await modalConfirm("Delete workout?", `${w.templateName} on ${fmtDT(w.date)} will be permanently removed.`, "Delete", true);
  if (!ok) return;
  store.data.workouts = store.data.workouts.filter((x) => x.id !== id);
  save();
  rerender();
  toast("Workout deleted");
}

const TRASH_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/></svg>`;

export function mount(container: HTMLElement): void {
  const sorted = [...store.data.workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (!sorted.length) {
    container.innerHTML = '<div class="empty" style="margin-top:14px">No workouts logged yet.<br>Start a session from the home screen and it will appear here.</div>';
    return;
  }
  let h = '<div style="margin-top:8px">';
  for (const w of sorted) {
    h += `<div class="wblock"><div class="whead">
      <div><b style="font-size:13.5px">${esc(w.templateName)}</b>
      <span class="dimtext" style="margin-left:8px">${fmtDT(w.date)}</span></div>
      <button class="iconbtn" aria-label="Delete workout" data-del="${esc(w.id)}">${TRASH_ICON}</button></div>
      <table><tbody>`;
    for (const e of w.entries) {
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
    btn.addEventListener("click", () => delWorkout(btn.dataset.del!, () => mount(container)));
  });
}
