import type { AppData } from "./types";
import {
  hadLocalData,
  loadLegacy,
  saveLegacy,
  persistMirror,
  createSnapshot as createSnapshotLegacy,
  latestProtectedCopy,
  requestPersistentStorage,
  normalizeData,
  readCachedInstallEvidence,
  persistInstallEvidence,
} from "../database/legacyStorage";
import { toast, fmtDT } from "./format";
import { modalConfirm } from "../components/modal";

// Captured once, at module load, before any write this session performs
// (initDataProtection's own persistMirror() call writes localStorage as a
// side effect) — so this is the only reliable "did the user have v15 data
// BEFORE this app session started" signal, PROVIDED this is truly the
// first-ever boot. See hasLegacyEvidence() below for why a live check
// isn't enough on its own.
const hadLegacyLocalDataAtBoot = hadLocalData();

// Whether there's real evidence of prior v15 usage — used to decide
// whether the migration should silently seed the legacy "My Programme"
// plan (returning user) or leave a blank slate for first-launch
// onboarding (genuinely new user). This can only be determined reliably
// on the device's true first-ever boot: the service worker's
// reload-on-first-activation (see initServiceWorker in app/main.ts)
// causes a SECOND page load shortly after a fresh install's first boot,
// and by then that first boot's own harmless startup writes
// (persistMirror's unconditional mirror) would make a live re-check
// wrongly see "evidence". readCachedInstallEvidence()/
// persistInstallEvidence() make the determination durable across that
// reload: the first boot that ever computes this writes it once, and
// every later boot (including the reload, and all future app opens) just
// reads the cached decision.
let legacyEvidencePromise: Promise<boolean> | null = null;

export function hasLegacyEvidence(): Promise<boolean> {
  if (!legacyEvidencePromise) {
    const cached = readCachedInstallEvidence();
    legacyEvidencePromise =
      cached !== null
        ? Promise.resolve(cached)
        : latestProtectedCopy().then((copy) => {
            const result = hadLegacyLocalDataAtBoot || Boolean(copy);
            persistInstallEvidence(result);
            return result;
          });
  }
  return legacyEvidencePromise;
}

export const store = {
  data: loadLegacy() as AppData,
};

export function save(reason = "save"): void {
  saveLegacy(store.data);
  void persistMirror(store.data, reason);
}

export async function createSnapshot(reason = "manual"): Promise<void> {
  await createSnapshotLegacy(store.data, reason);
}

export async function recoverProtectedCopy(onRestored: () => void): Promise<void> {
  const snap = await latestProtectedCopy();
  if (!snap) {
    toast("No automatic backup found yet");
    return;
  }
  const when = snap.createdAt ? fmtDT(snap.createdAt) : "None";
  const ok = await modalConfirm(
    "Restore automatic backup?",
    `From ${when} — ${snap.data.workouts.length} workouts. This replaces the data currently on this phone.`,
    "Restore"
  );
  if (!ok) return;
  await createSnapshot("before-recover");
  store.data = normalizeData(snap.data);
  save("recover");
  onRestored();
  toast("Backup restored");
}

export async function initDataProtection(onRecovered: () => void): Promise<void> {
  // Kick off (and memoize) the IndexedDB read now, before persistMirror()
  // below writes a fresh mirror record as a side effect.
  const evidencePromise = hasLegacyEvidence();
  if (!hadLegacyLocalDataAtBoot) {
    const snap = await latestProtectedCopy();
    if (snap && snap.data && snap.data.workouts && snap.data.workouts.length) {
      store.data = normalizeData(snap.data);
      saveLegacy(store.data);
      onRecovered();
      toast("Data recovered");
    }
  }
  await requestPersistentStorage(store.data);
  void persistMirror(store.data, "startup");
  if (!store.data.meta.lastSnapshotAt) void createSnapshot("initial");
  await evidencePromise; // ensure it has resolved (from the pre-write read) before callers rely on hasLegacyEvidence()
}
