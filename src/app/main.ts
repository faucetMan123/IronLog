import "../styles/global.css";
import { initModal } from "../components/modal";
import { initRouter } from "./router";
import { initDataProtection, hasLegacyEvidence } from "./store";
import { runV15Migration } from "../migrations/runMigration";
import { getDb } from "../database/db";
import { isOnboardingCompleted } from "../database/settingsRepo";
import { hasAnyPlans } from "../database/plansRepo";
import type { TabId } from "./types";

function initBackButton(): void {
  document.getElementById("backBtn")?.addEventListener("click", () => history.back());
}

function initServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .then((reg) => {
        reg.update().catch(() => {});
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(() => {});
  });
  let reloadedForSW = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadedForSW) return;
    reloadedForSW = true;
    window.location.reload();
  });
}

// Runs the one-time v15 -> SQLite migration, after legacy-storage recovery
// has settled and before the first real screen renders — the initial tab
// (onboarding vs. home) depends on its outcome (did it seed a plan for a
// returning user, or leave a blank slate for a new one).
async function runMigrationStep(): Promise<void> {
  try {
    const outcome = await runV15Migration(await hasLegacyEvidence());
    document.body.dataset.migrationStatus = outcome.status;
    if (outcome.status === "failed") {
      console.error("v15 migration validation failed", outcome.issues);
    }
  } catch (err) {
    document.body.dataset.migrationStatus = "error";
    console.error("v15 migration threw", err);
  }
}

async function determineInitialTab(): Promise<TabId> {
  const [onboarded, hasPlans] = await Promise.all([isOnboardingCompleted(), hasAnyPlans()]);
  return onboarded || hasPlans ? "home" : "onboarding";
}

// Local-only diagnostic hook (no network, no telemetry) so the Playwright
// integration suite can query the real SQLite database after migration
// instead of only observing the data-migration-status marker. Harmless to
// ship: this app has no server, so there's nothing remote to expose to.
declare global {
  interface Window {
    __elSupremoDebug?: { getDb: typeof getDb };
  }
}
window.__elSupremoDebug = { getDb };

async function boot(): Promise<void> {
  initModal();
  initBackButton();
  // No screen has rendered yet, so the recovery callback has nothing to
  // refresh — initRouter()'s first render below already reflects it.
  await initDataProtection(() => {});
  await runMigrationStep();
  const initialTab = await determineInitialTab();
  initRouter(initialTab);
  initServiceWorker();
}

void boot();
