import type { Session } from "./types";

let current: Session | null = null;

export function getSession(): Session | null {
  return current;
}

export function setSession(s: Session | null): void {
  current = s;
}
