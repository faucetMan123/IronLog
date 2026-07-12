import "../styles/global.css";
import { initModal } from "../components/modal";
import { initRouter, render } from "./router";
import { initDataProtection } from "./store";
import { runV15Migration } from "../migrations/runMigration";
import { getDb } from "../database/db";

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

// Runs the one-time v15 -> SQLite migration in the background, after any
// legacy-storage recovery has settled. Non-blocking and non-visible: no
// screen reads from SQLite yet (that lands in Phase 5), so a failure here
// must never break the legacy-storage-backed UI that's already on screen.
// The status is recorded on <body data-migration-status> for diagnostics
// and for the Playwright integration test to observe.
async function initSqliteMigration(): Promise<void> {
  try {
    const outcome = await runV15Migration();
    document.body.dataset.migrationStatus = outcome.status;
    if (outcome.status === "failed") {
      console.error("v15 migration validation failed", outcome.issues);
    }
  } catch (err) {
    document.body.dataset.migrationStatus = "error";
    console.error("v15 migration threw", err);
  }
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

initModal();
initBackButton();
initRouter();
void initDataProtection(render).then(() => initSqliteMigration());
initServiceWorker();
