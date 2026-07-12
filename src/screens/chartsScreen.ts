import { esc } from "../app/format";
import { ICON_SESS, ICON_CHART } from "../components/icons";
import { drawLine } from "../progress/charts";
import { dayVolumeRows, exerciseProgressRows, distinctPerformedExerciseIds, hasAnySessions, type ExerciseProgressRow, type DayVolumeRow } from "../database/sessionsRepo";
import { listPlans, listWorkoutDays, type WorkoutDayRecord } from "../database/plansRepo";
import { getProgressMode, openProgressMode } from "../app/router";

export type ProgressRange = "1m" | "6m" | "1y" | "all";

let selectedDayId: string | null = null;
let selectedExerciseId: string | null = null;
let progressRange: ProgressRange = "all";
let allDays: WorkoutDayRecord[] = [];
let allExercises: { exerciseId: string; exerciseName: string }[] = [];

function rangeCutoff(range: ProgressRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  if (range === "1m") d.setMonth(d.getMonth() - 1);
  else if (range === "6m") d.setMonth(d.getMonth() - 6);
  else if (range === "1y") d.setFullYear(d.getFullYear() - 1);
  return d;
}

function filterByRange<T extends { isoDate: string }>(rows: T[], range: ProgressRange): T[] {
  const cut = rangeCutoff(range);
  return cut ? rows.filter((r) => new Date(r.isoDate) >= cut) : rows;
}

function rangeRow(): string {
  const opts: [ProgressRange, string][] = [
    ["1m", "1 Month"],
    ["6m", "6 Months"],
    ["1y", "1 Year"],
    ["all", "All Time"],
  ];
  return `<div class="context-row" id="rangeRow">` + opts.map(([k, l]) => `<button class="context-btn ${progressRange === k ? "active" : ""}" data-range="${k}">${l}</button>`).join("") + `</div>`;
}

function wireRangeRow(container: HTMLElement, rerender: () => void): void {
  container.querySelectorAll<HTMLButtonElement>("#rangeRow [data-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      progressRange = btn.dataset.range as ProgressRange;
      rerender();
    });
  });
}

async function loadDays(): Promise<WorkoutDayRecord[]> {
  const plans = await listPlans(true);
  const days: WorkoutDayRecord[] = [];
  for (const p of plans) days.push(...(await listWorkoutDays(p.id)));
  return days;
}

export async function mount(container: HTMLElement): Promise<void> {
  const rerender = () => void mount(container);
  if (!(await hasAnySessions())) {
    container.innerHTML = '<div class="empty" style="margin-top:14px">Log a couple of workouts and your<br>progress shows up here.</div>';
    return;
  }

  const progressMode = getProgressMode();

  if (!progressMode) {
    container.innerHTML = `<div style="display:flex;flex-direction:column;gap:13px;margin-top:6px">
      <button class="card progress-option" data-mode="workout">
        <div class="es-ico">${ICON_SESS}</div>
        <div style="flex:1;text-align:left">
          <div class="display" style="font-size:17px">Workout Progress</div>
          <div class="dimtext" style="margin-top:4px;line-height:1.45">Total volume per session for one of your workout days, over time.</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="color:var(--text-faint)"><path d="M9 5l7 7-7 7"/></svg>
      </button>
      <button class="card progress-option" data-mode="exercise">
        <div class="es-ico">${ICON_CHART}</div>
        <div style="flex:1;text-align:left">
          <div class="display" style="font-size:17px">Exercise Progress</div>
          <div class="dimtext" style="margin-top:4px;line-height:1.45">Top weight and volume for a single lift, over time.</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="color:var(--text-faint)"><path d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>`;
    container.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => openProgressMode(btn.dataset.mode as "workout" | "exercise"));
    });
    return;
  }

  if (progressMode === "workout") {
    allDays = await loadDays();
    if (!selectedDayId || !allDays.some((d) => d.id === selectedDayId)) selectedDayId = allDays[0]?.id ?? null;
    let h = `<div class="chart-controls" style="margin-top:4px"><select id="daySelect">`;
    for (const d of allDays) h += `<option value="${d.id}" ${d.id === selectedDayId ? "selected" : ""}>${esc(d.name)}</option>`;
    h += `</select></div>`;
    h += rangeRow();
    const rows: DayVolumeRow[] = selectedDayId ? filterByRange(await dayVolumeRows(selectedDayId), progressRange) : [];
    const best = rows.length ? Math.max(...rows.map((r) => r.volume)) : 0;
    const latest = rows.length ? rows[rows.length - 1].volume : 0;
    h += `<div class="chart-summary">
      <div class="mini"><div class="v mono">${rows.length}</div><div class="l">Sessions</div></div>
      <div class="mini"><div class="v mono">${best ? Math.round(best) : "—"}</div><div class="l">Best volume</div></div>
      <div class="mini"><div class="v mono">${latest ? Math.round(latest) : "—"}</div><div class="l">Latest</div></div>
    </div>`;
    if (!rows.length) h += `<div class="empty">No sessions of this workout day in the selected period.</div>`;
    else h += `<div class="sectionlabel">Total session volume (kg × reps)</div><div class="card" style="padding:12px 8px 8px"><canvas class="chart" id="chartT"></canvas></div>`;
    container.innerHTML = h;
    wireRangeRow(container, rerender);
    container.querySelector<HTMLSelectElement>("#daySelect")?.addEventListener("change", (e) => {
      selectedDayId = (e.target as HTMLSelectElement).value;
      rerender();
    });
    requestAnimationFrame(() => drawLine("chartT", rows.map((r) => r.date), rows.map((r) => r.volume), "#E02B35"));
    return;
  }

  // exercise progress
  allExercises = await distinctPerformedExerciseIds();
  if (!selectedExerciseId || !allExercises.some((e) => e.exerciseId === selectedExerciseId)) selectedExerciseId = allExercises[0]?.exerciseId ?? null;
  let h = `<div class="chart-controls" style="margin-top:4px"><select id="exSelect">`;
  for (const e of allExercises) h += `<option value="${e.exerciseId}" ${e.exerciseId === selectedExerciseId ? "selected" : ""}>${esc(e.exerciseName)}</option>`;
  h += `</select></div>`;
  h += rangeRow();
  const rows: ExerciseProgressRow[] = selectedExerciseId ? filterByRange(await exerciseProgressRows(selectedExerciseId), progressRange) : [];
  const bestTop = rows.length ? Math.max(...rows.map((r) => r.topWeight)) : 0;
  const bestVol = rows.length ? Math.max(...rows.map((r) => r.volume)) : 0;
  h += `<div class="chart-summary">
    <div class="mini"><div class="v mono">${rows.length}</div><div class="l">Sessions</div></div>
    <div class="mini"><div class="v mono">${bestTop ? Math.round(bestTop * 10) / 10 : "—"}</div><div class="l">Best kg</div></div>
    <div class="mini"><div class="v mono">${bestVol ? Math.round(bestVol) : "—"}</div><div class="l">Best volume</div></div>
  </div>`;
  const exName = allExercises.find((e) => e.exerciseId === selectedExerciseId)?.exerciseName ?? "";
  if (!rows.length) h += `<div class="empty">No sessions for ${esc(exName)} in this period.</div>`;
  else
    h += `<div class="sectionlabel">Top set weight (kg)</div>
    <div class="card" style="padding:12px 8px 8px"><canvas class="chart" id="chartW"></canvas></div>
    <div class="sectionlabel">Exercise volume (kg × reps)</div>
    <div class="card" style="padding:12px 8px 8px"><canvas class="chart" id="chartV"></canvas></div>`;
  container.innerHTML = h;
  wireRangeRow(container, rerender);
  container.querySelector<HTMLSelectElement>("#exSelect")?.addEventListener("change", (e) => {
    selectedExerciseId = (e.target as HTMLSelectElement).value;
    rerender();
  });
  requestAnimationFrame(() => {
    drawLine("chartW", rows.map((r) => r.date), rows.map((r) => r.topWeight), "#E02B35");
    drawLine("chartV", rows.map((r) => r.date), rows.map((r) => r.volume), "#4D8BF0");
  });
}

let resizeDebounce: ReturnType<typeof setTimeout> | undefined;
export function redrawOnResize(): void {
  clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(() => {
    const content = document.getElementById("content");
    if (content) void mount(content);
  }, 200);
}
