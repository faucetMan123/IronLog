import type { AppData } from "../app/types";
import { fmtDT, fmtDate } from "../app/format";

export function buildText(data: AppData): string {
  const sorted = [...data.workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let out = `El Supremo Export — ${sorted.length} sessions — generated ${new Date().toLocaleString()}\n` + "=".repeat(60) + "\n\n";
  for (const w of sorted) {
    out += `${fmtDT(w.date)} — ${w.templateName}\n`;
    for (const e of w.entries) {
      out += `  - ${e.exerciseName}: ${e.sets.map((s) => `${s.weight}kg x ${s.reps}`).join(", ")}\n`;
    }
    out += "\n";
  }
  return out;
}

export function buildTSV(data: AppData): string {
  let out = "Date\tTemplate\tExercise\tSet\tWeight(kg)\tReps\n";
  [...data.workouts]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((w) => {
      w.entries.forEach((e) =>
        e.sets.forEach((s, i) => {
          out += `${fmtDate(w.date)}\t${w.templateName}\t${e.exerciseName}\t${i + 1}\t${s.weight}\t${s.reps}\n`;
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
