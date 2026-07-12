import { store } from "../app/store";
import { esc } from "../app/format";
import { STAT_ICONS, ICON_SETS, ICON_SESS } from "../components/icons";
import { go } from "../app/router";

function workoutStatsForRange(startDate: Date | null) {
  const workouts = startDate ? store.data.workouts.filter((w) => new Date(w.date) >= startDate) : store.data.workouts;
  const sessions = workouts.length;
  const sets = workouts.reduce((sum, w) => sum + w.entries.reduce((a, e) => a + e.sets.length, 0), 0);
  return { sessions, sets };
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - day + 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function statBlock(label: string, stats: { sessions: number; sets: number }): string {
  return `<div class="es-stat">
    <div class="es-ico">${STAT_ICONS[label] || STAT_ICONS.Total}</div>
    <div class="es-main">
      <div class="es-lab display">${esc(label)}</div>
      <div class="es-num display mono"><span>${stats.sessions}</span><span class="es-unit">sessions</span></div>
    </div>
    <div class="es-div"></div>
    <div class="es-side">
      <div class="es-row"><span class="es-bico">${ICON_SETS}</span><span class="es-rlab display">Sets</span><span class="es-rnum mono">${stats.sets}</span></div>
    </div>
  </div>`;
}

export function mount(container: HTMLElement): void {
  const now = new Date();
  const week = workoutStatsForRange(startOfWeek(now));
  const month = workoutStatsForRange(startOfMonth(now));
  const year = workoutStatsForRange(startOfYear(now));
  const total = workoutStatsForRange(null);
  container.innerHTML = `<div class="es-statstack">
      ${statBlock("Week", week)}
      ${statBlock("Month", month)}
      ${statBlock("Year", year)}
      ${statBlock("Total", total)}
    </div>
    <button class="btn btn-primary es-startbtn" id="startWorkoutBtn">
      <span class="es-startico">${ICON_SESS}</span> Start Workout</button>`;
  container.querySelector("#startWorkoutBtn")?.addEventListener("click", () => go("templates"));
}
