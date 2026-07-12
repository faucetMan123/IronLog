import type { WorkoutDraft } from "../database/sessionsRepo";

let current: WorkoutDraft | null = null;

export function getSession(): WorkoutDraft | null {
  return current;
}

export function setSession(s: WorkoutDraft | null): void {
  current = s;
}
