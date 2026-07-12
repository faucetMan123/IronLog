import type { NavHistoryState, ProgressMode, TabId } from "./types";
import { getSession, setSession } from "./session";
import { modalConfirm } from "../components/modal";
import * as home from "../screens/home";
import * as start from "../screens/start";
import * as session from "../screens/session";
import * as sheet from "../screens/sheet";
import * as prs from "../screens/prs";
import * as chartsScreen from "../screens/chartsScreen";
import * as exportScreen from "../screens/exportScreen";
import * as editScreen from "../screens/editScreen";

export interface NavItem {
  id: TabId;
  label: string;
  icon: string;
}

export const NAV: NavItem[] = [
  { id: "home", label: "Start", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>' },
  { id: "sheet", label: "Log", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>' },
  { id: "prs", label: "PR", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.2 1 5.9L12 16.5 6.8 19.3l1-5.9-4.3-4.2 5.9-.9L12 3z"/></svg>' },
  { id: "charts", label: "Progress", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 20h18M5 16l4-6 4 3 6-8"/></svg>' },
  { id: "export", label: "Data", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>' },
  { id: "edit", label: "Edit", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>' },
];

let tab: TabId = "home";
let progressMode: ProgressMode = null;

export function getTab(): TabId {
  return tab;
}
export function getProgressMode(): ProgressMode {
  return progressMode;
}
export function setProgressMode(m: ProgressMode): void {
  progressMode = m;
}

export function go(t: TabId, replace = false): void {
  if (t === "charts") progressMode = null;
  const state: NavHistoryState = { tab: t };
  if (replace) history.replaceState(state, "");
  else history.pushState(state, "");
  applyState(state);
}

export function openProgressMode(mode: "workout" | "exercise"): void {
  const state: NavHistoryState = { tab: "charts", mode };
  history.pushState(state, "");
  progressMode = mode;
  render();
}

export async function navTap(t: TabId): Promise<void> {
  if (getSession()) {
    const ok = await modalConfirm("Leave workout?", "This session isn't finished — unsaved sets will be lost.", "Leave", true);
    if (!ok) return;
    setSession(null);
  }
  go(t);
}

window.addEventListener("popstate", async (e: PopStateEvent) => {
  const state = e.state as NavHistoryState | null;
  const target: TabId = state?.tab || "home";
  if (getSession() && target !== "session") {
    const ok = await modalConfirm("Leave workout?", "This session isn't finished — unsaved sets will be lost.", "Leave", true);
    if (!ok) {
      history.pushState({ tab: "session" } as NavHistoryState, "");
      return;
    }
    setSession(null);
  }
  applyState({ tab: target, mode: state?.mode });
});

function applyState(s: NavHistoryState): void {
  tab = s.tab;
  if (tab === "charts") progressMode = s.mode || null;
  if (tab === "session" && !getSession()) tab = "home"; // stale history entry
  render();
}

function renderNav(navEl: HTMLElement): void {
  if (tab === "session") {
    navEl.style.display = "none";
    return;
  }
  navEl.style.display = "flex";
  navEl.innerHTML = NAV.map((n) => `<button class="navbtn ${tab === n.id ? "active" : ""}" data-nav="${n.id}">${n.icon}<span>${n.label}</span></button>`).join("");
  navEl.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => void navTap(btn.dataset.nav as TabId));
  });
}

const TITLES: Record<TabId, string> = {
  home: "El Supremo",
  templates: "Start",
  session: "Workout",
  sheet: "Log",
  prs: "PR",
  charts: "Progress",
  export: "Data",
  edit: "Edit",
};

export function render(): void {
  const headerTitle = document.getElementById("headerTitle");
  const backBtn = document.getElementById("backBtn");
  const logo = document.getElementById("logoImg");
  const nav = document.getElementById("nav");
  const content = document.getElementById("content");
  if (!content || !nav) return;

  const title = tab === "session" ? getSession()?.templateName ?? "Workout" : TITLES[tab] ?? "El Supremo";
  if (headerTitle) headerTitle.textContent = title;
  if (backBtn) backBtn.style.display = tab === "home" ? "none" : "flex";
  if (logo) logo.style.display = tab === "home" ? "block" : "none";

  renderNav(nav);

  if (tab === "home") home.mount(content);
  else if (tab === "templates") start.mount(content);
  else if (tab === "session") session.mount(content);
  else if (tab === "sheet") sheet.mount(content);
  else if (tab === "prs") prs.mount(content);
  else if (tab === "charts") chartsScreen.mount(content);
  else if (tab === "export") exportScreen.mount(content);
  else if (tab === "edit") editScreen.mount(content);
  content.scrollTop = 0;
}

export function initRouter(): void {
  history.replaceState({ tab: "home" } as NavHistoryState, "");
  render();
  window.addEventListener("resize", () => {
    if (tab === "charts") chartsScreen.redrawOnResize();
  });
}
