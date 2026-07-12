import { describe, it, expect } from "vitest";
import { placementForTab } from "../../ads/placements";
import type { TabId } from "../../app/types";

const ALL_TABS: TabId[] = [
  "home",
  "startWorkout",
  "session",
  "sheet",
  "prs",
  "charts",
  "export",
  "plans",
  "planDetail",
  "onboarding",
  "mentorQuestionnaire",
  "mentorPreview",
  "starterPlanPicker",
  "privacy",
];

describe("placementForTab", () => {
  it("allows ads on exactly the four permitted landing screens", () => {
    expect(placementForTab("home", null, false)).toBe("home");
    expect(placementForTab("sheet", null, false)).toBe("historyLanding");
    expect(placementForTab("charts", null, false)).toBe("progressLanding");
    expect(placementForTab("plans", null, false)).toBe("planLibrary");
  });

  it("forbids ads on every other screen", () => {
    const permitted: TabId[] = ["home", "sheet", "charts", "plans"];
    for (const tab of ALL_TABS.filter((t) => !permitted.includes(t))) {
      expect(placementForTab(tab, null, false), `tab "${tab}" must not show an ad`).toBeNull();
    }
  });

  it("never allows an ad once a workout session is active, regardless of tab", () => {
    for (const tab of ALL_TABS) {
      expect(placementForTab(tab, null, true), `tab "${tab}" with an active session must not show an ad`).toBeNull();
    }
  });

  it("forbids ads on Progress once a specific chart is open (not the landing/picker state)", () => {
    expect(placementForTab("charts", "workout", false)).toBeNull();
    expect(placementForTab("charts", "exercise", false)).toBeNull();
  });

  it("explicitly forbids ads in onboarding, mentor flow, backup/export, privacy, and plan editing", () => {
    const forbidden: TabId[] = ["onboarding", "mentorQuestionnaire", "mentorPreview", "starterPlanPicker", "export", "privacy", "planDetail", "prs", "session", "startWorkout"];
    for (const tab of forbidden) {
      expect(placementForTab(tab, null, false)).toBeNull();
    }
  });
});
