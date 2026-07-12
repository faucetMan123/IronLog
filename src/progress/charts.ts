import type { AppData, Workout, WorkoutEntry } from "../app/types";

export type ProgressRange = "1m" | "6m" | "1y" | "all";
export type ChartContext = "heavy" | "volume";

export function exerciseNames(data: AppData): string[] {
  const s = new Set<string>();
  data.workouts.forEach((w) => w.entries.forEach((e) => s.add(e.exerciseName)));
  return [...s].sort();
}

export function rangeCutoff(range: ProgressRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  if (range === "1m") d.setMonth(d.getMonth() - 1);
  else if (range === "6m") d.setMonth(d.getMonth() - 6);
  else if (range === "1y") d.setFullYear(d.getFullYear() - 1);
  return d;
}

export function workoutsInRange(data: AppData, range: ProgressRange): Workout[] {
  const cut = rangeCutoff(range);
  return [...data.workouts]
    .filter((w) => !cut || new Date(w.date) >= cut)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export interface SetNumbers {
  w: number;
  r: number;
}

export function entryNumbers(entry: WorkoutEntry): SetNumbers[] {
  return (entry.sets || [])
    .map((s) => ({ w: parseFloat(s.weight) || 0, r: parseFloat(s.reps) || 0 }))
    .filter((n) => n.w > 0 || n.r > 0);
}

// Every workout is classified heavy or volume — nothing is dropped.
export function inferEntryContext(workout: Workout, entry: WorkoutEntry): ChartContext {
  const template = String(workout.templateName || "").toLowerCase();
  if (template.includes("heavy")) return "heavy";
  if (template.includes("volume")) return "volume";
  const reps = entryNumbers(entry)
    .filter((n) => n.r > 0)
    .map((n) => n.r);
  if (!reps.length) return "heavy";
  const max = Math.max(...reps);
  return max <= 8 ? "heavy" : "volume";
}

export interface ChartRow {
  date: string;
  top: number;
  vol: number;
}

export function chartRowsFor(data: AppData, range: ProgressRange, exerciseName: string, mode: ChartContext): ChartRow[] {
  const rows: ChartRow[] = [];
  workoutsInRange(data, range).forEach((w) => {
    const e = w.entries.find((x) => x.exerciseName === exerciseName);
    if (!e) return;
    if (inferEntryContext(w, e) !== mode) return;
    const nums = entryNumbers(e);
    if (!nums.length) return;
    rows.push({
      date: new Date(w.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      top: Math.max(0, ...nums.map((n) => n.w)),
      vol: nums.reduce((a, n) => a + n.w * n.r, 0),
    });
  });
  return rows;
}

export function chartContextCounts(data: AppData, range: ProgressRange, exerciseName: string | null): Record<ChartContext, number> {
  const counts: Record<ChartContext, number> = { heavy: 0, volume: 0 };
  if (!exerciseName) return counts;
  workoutsInRange(data, range).forEach((w) => {
    const e = w.entries.find((x) => x.exerciseName === exerciseName);
    if (!e) return;
    counts[inferEntryContext(w, e)]++;
  });
  return counts;
}

export interface WorkoutVolumeRow {
  date: string;
  vol: number;
}

export function workoutVolumeRows(data: AppData, range: ProgressRange, templateId: string): WorkoutVolumeRow[] {
  return workoutsInRange(data, range)
    .filter((w) => w.templateId === templateId)
    .map((w) => ({
      date: new Date(w.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      vol: w.entries.reduce((sum, e) => sum + entryNumbers(e).reduce((a, n) => a + n.w * n.r, 0), 0),
    }));
}

export function drawLine(id: string, labels: string[], vals: number[], color: string): void {
  const cv = document.getElementById(id) as HTMLCanvasElement | null;
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth;
  const H = cv.clientHeight;
  cv.width = W * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  if (!vals.length) {
    ctx.fillStyle = "#98A0AF";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data yet", W / 2, H / 2);
    return;
  }
  const padL = 40, padR = 14, padT = 12, padB = 26;
  const minV = 0;
  const maxV = Math.max(...vals) * 1.15 || 10;
  const x = (i: number) => (vals.length === 1 ? padL + (W - padL - padR) / 2 : padL + ((W - padL - padR) * i) / (vals.length - 1));
  const y = (v: number) => H - padB - ((H - padB - padT) * (v - minV)) / (maxV - minV);
  ctx.strokeStyle = "#313643";
  ctx.fillStyle = "#6B7280";
  ctx.font = "10px sans-serif";
  ctx.lineWidth = 1;
  ctx.textAlign = "left";
  for (let g = 0; g <= 4; g++) {
    const v = minV + ((maxV - minV) * g) / 4;
    const yy = y(v);
    ctx.beginPath();
    ctx.moveTo(padL, yy);
    ctx.lineTo(W - padR, yy);
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(String(Math.round(v)), 4, yy + 3);
  }
  const step = Math.ceil(labels.length / 6);
  labels.forEach((l, i) => {
    if (i % step === 0 || i === labels.length - 1) {
      ctx.fillText(l, Math.min(x(i) - 14, W - 42), H - 8);
    }
  });
  const grad = ctx.createLinearGradient(0, padT, 0, H - padB);
  grad.addColorStop(0, color + "33");
  grad.addColorStop(1, color + "00");
  ctx.beginPath();
  vals.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
  ctx.lineTo(x(vals.length - 1), H - padB);
  ctx.lineTo(x(0), H - padB);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.25;
  ctx.lineJoin = "round";
  ctx.beginPath();
  vals.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
  ctx.stroke();
  ctx.fillStyle = color;
  vals.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(v), 3.2, 0, 7);
    ctx.fill();
  });
}
