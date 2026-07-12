import type { ProgressMode, TabId } from "../app/types";

// The ONLY four screens ads are permitted to appear on, per the product
// rules: home dashboard, history landing, progress landing, plan library.
// Every other screen — including the active workout, onboarding, mentor
// flow, plan editing, backup/export, and the privacy centre — must never
// show an ad.
export type AdPlacement = "home" | "historyLanding" | "progressLanding" | "planLibrary";

/** Pure function (easy to test exhaustively): given the current navigation
 *  state, decides whether an ad placement is permitted right now, and
 *  which one. Returns null everywhere ads aren't allowed — including,
 *  defensively, whenever a workout is in progress, even though none of
 *  the permitted tabs are reachable while a session is active anyway. */
export function placementForTab(tab: TabId, progressMode: ProgressMode, sessionActive: boolean): AdPlacement | null {
  if (sessionActive) return null;
  switch (tab) {
    case "home":
      return "home";
    case "sheet":
      return "historyLanding";
    case "charts":
      // Only the picker/landing state, not once a specific workout day or
      // exercise's chart is open (progressMode is set once the user drills in).
      return progressMode ? null : "progressLanding";
    case "plans":
      return "planLibrary";
    default:
      return null;
  }
}
