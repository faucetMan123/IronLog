import { fmtDT, fmtDate } from "../app/format";
import type { SessionDetail } from "../database/sessionsRepo";

export function buildText(sessions: SessionDetail[]): string {
  const sorted = [...sessions].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
  let out = `El Supremo Export — ${sorted.length} sessions — generated ${new Date().toLocaleString()}\n` + "=".repeat(60) + "\n\n";
  for (const s of sorted) {
    out += `${fmtDT(s.completedAt)} — ${s.templateName}\n`;
    for (const e of s.exercises) {
      out += `  - ${e.exerciseName}: ${e.sets.map((set) => `${set.weight}kg x ${set.reps}`).join(", ")}\n`;
    }
    out += "\n";
  }
  return out;
}

export function buildCSV(sessions: SessionDetail[]): string {
  let out = "Date,Template,Exercise,Set,Weight(kg),Reps\n";
  [...sessions]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .forEach((s) => {
      s.exercises.forEach((e) =>
        e.sets.forEach((set, i) => {
          out += `${fmtDate(s.completedAt)},"${s.templateName}","${e.exerciseName}",${i + 1},${set.weight},${set.reps}\n`;
        })
      );
    });
  return out;
}

export function downloadFile(name: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
