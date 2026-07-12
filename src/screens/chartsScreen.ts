import { store } from "../app/store";
import { esc } from "../app/format";
import { ICON_SESS, ICON_CHART } from "../components/icons";
import {
  exerciseNames,
  chartContextCounts,
  chartRowsFor,
  workoutVolumeRows,
  drawLine,
  type ChartContext,
  type ProgressRange,
} from "../progress/charts";
import { getProgressMode, openProgressMode } from "../app/router";

let chartExercise: string | null = null;
let chartContext: ChartContext = "heavy";
let progressTemplate: string | null = null;
let progressRange: ProgressRange = "all";

function rangeRow(): string {
  const opts: [ProgressRange, string][] = [
    ["1m", "1 Month"],
    ["6m", "6 Months"],
    ["1y", "1 Year"],
    ["all", "All Time"],
  ];
  return (
    `<div class="context-row" id="rangeRow">` +
    opts.map(([k, l]) => `<button class="context-btn ${progressRange === k ? "active" : ""}" data-range="${k}">${l}</button>`).join("") +
    `</div>`
  );
}

function wireRangeRow(container: HTMLElement, rerender: () => void): void {
  container.querySelectorAll<HTMLButtonElement>("#rangeRow [data-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      progressRange = btn.dataset.range as ProgressRange;
      rerender();
    });
  });
}

export function mount(container: HTMLElement): void {
  const rerender = () => mount(container);
  if (!store.data.workouts.length) {
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
          <div class="dimtext" style="margin-top:4px;line-height:1.45">Total volume per session for each of your six templates, over time.</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="color:var(--text-faint)"><path d="M9 5l7 7-7 7"/></svg>
      </button>
      <button class="card progress-option" data-mode="exercise">
        <div class="es-ico">${ICON_CHART}</div>
        <div style="flex:1;text-align:left">
          <div class="display" style="font-size:17px">Exercise Progress</div>
          <div class="dimtext" style="margin-top:4px;line-height:1.45">Top weight and volume for a single lift, split by Heavy and Volume days.</div>
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
    if (!progressTemplate || !store.data.templates.some((t) => t.id === progressTemplate)) {
      progressTemplate = store.data.templates[0]?.id ?? null;
    }
    let h = `<div class="chart-controls" style="margin-top:4px"><select id="tplSelect">`;
    for (const t of store.data.templates) h += `<option value="${t.id}" ${t.id === progressTemplate ? "selected" : ""}>${esc(t.name)}</option>`;
    h += `</select></div>`;
    h += rangeRow();
    const rows = workoutVolumeRows(store.data, progressRange, progressTemplate!);
    const best = rows.length ? Math.max(...rows.map((r) => r.vol)) : 0;
    const latest = rows.length ? rows[rows.length - 1].vol : 0;
    h += `<div class="chart-summary">
      <div class="mini"><div class="v mono">${rows.length}</div><div class="l">Sessions</div></div>
      <div class="mini"><div class="v mono">${best ? Math.round(best) : "—"}</div><div class="l">Best volume</div></div>
      <div class="mini"><div class="v mono">${latest ? Math.round(latest) : "—"}</div><div class="l">Latest</div></div>
    </div>`;
    if (!rows.length) h += `<div class="empty">No sessions of this template in the selected period.</div>`;
    else
      h += `<div class="sectionlabel">Total session volume (kg × reps)</div>
      <div class="card" style="padding:12px 8px 8px"><canvas class="chart" id="chartT"></canvas></div>`;
    container.innerHTML = h;
    wireRangeRow(container, rerender);
    container.querySelector<HTMLSelectElement>("#tplSelect")?.addEventListener("change", (e) => {
      progressTemplate = (e.target as HTMLSelectElement).value;
      rerender();
    });
    requestAnimationFrame(() => {
      const r = workoutVolumeRows(store.data, progressRange, progressTemplate!);
      drawLine("chartT", r.map((x) => x.date), r.map((x) => x.vol), "#E02B35");
    });
    return;
  }

  // exercise progress
  const names = exerciseNames(store.data);
  if (!chartExercise || !names.includes(chartExercise)) chartExercise = names[0] ?? null;
  const counts = chartContextCounts(store.data, progressRange, chartExercise);
  let h = `<div class="chart-controls" style="margin-top:4px"><select id="exSelect">`;
  for (const n of names) h += `<option ${n === chartExercise ? "selected" : ""}>${esc(n)}</option>`;
  h += `</select></div>`;
  h += `<div class="context-row ctx2">
    <button class="context-btn ${chartContext === "heavy" ? "active" : ""}" data-ctx="heavy">Heavy days <span class="mono">${counts.heavy}</span></button>
    <button class="context-btn ${chartContext === "volume" ? "active" : ""}" data-ctx="volume">Volume days <span class="mono">${counts.volume}</span></button>
  </div>`;
  h += rangeRow();
  const rows = chartExercise ? chartRowsFor(store.data, progressRange, chartExercise, chartContext) : [];
  const bestTop = rows.length ? Math.max(...rows.map((r) => r.top)) : 0;
  const bestVol = rows.length ? Math.max(...rows.map((r) => r.vol)) : 0;
  h += `<div class="chart-summary">
    <div class="mini"><div class="v mono">${rows.length}</div><div class="l">Sessions</div></div>
    <div class="mini"><div class="v mono">${bestTop ? Math.round(bestTop * 10) / 10 : "—"}</div><div class="l">Best kg</div></div>
    <div class="mini"><div class="v mono">${bestVol ? Math.round(bestVol) : "—"}</div><div class="l">Best volume</div></div>
  </div>`;
  if (!rows.length) h += `<div class="empty">No ${chartContext} sessions for ${esc(chartExercise ?? "")} in this period.</div>`;
  else
    h += `<div class="sectionlabel">Top set weight (kg)</div>
    <div class="card" style="padding:12px 8px 8px"><canvas class="chart" id="chartW"></canvas></div>
    <div class="sectionlabel">Exercise volume (kg × reps)</div>
    <div class="card" style="padding:12px 8px 8px"><canvas class="chart" id="chartV"></canvas></div>`;
  container.innerHTML = h;
  wireRangeRow(container, rerender);
  container.querySelector<HTMLSelectElement>("#exSelect")?.addEventListener("change", (e) => {
    chartExercise = (e.target as HTMLSelectElement).value;
    rerender();
  });
  container.querySelectorAll<HTMLButtonElement>("[data-ctx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      chartContext = btn.dataset.ctx as ChartContext;
      rerender();
    });
  });
  requestAnimationFrame(() => {
    const r = chartExercise ? chartRowsFor(store.data, progressRange, chartExercise, chartContext) : [];
    drawLine("chartW", r.map((x) => x.date), r.map((x) => x.top), "#E02B35");
    drawLine("chartV", r.map((x) => x.date), r.map((x) => x.vol), "#4D8BF0");
  });
}

export function redrawOnResize(): void {
  if (getProgressMode() === "workout") {
    const r = progressTemplate ? workoutVolumeRows(store.data, progressRange, progressTemplate) : [];
    drawLine("chartT", r.map((x) => x.date), r.map((x) => x.vol), "#E02B35");
  } else if (getProgressMode() === "exercise") {
    const r = chartExercise ? chartRowsFor(store.data, progressRange, chartExercise, chartContext) : [];
    drawLine("chartW", r.map((x) => x.date), r.map((x) => x.top), "#E02B35");
    drawLine("chartV", r.map((x) => x.date), r.map((x) => x.vol), "#4D8BF0");
  }
}
