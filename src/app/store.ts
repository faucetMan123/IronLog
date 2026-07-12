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
} from "../database/legacyStorage";
import { toast, fmtDT } from "./format";
import { modalConfirm } from "../components/modal";

const HAD_LOCAL_DATA = hadLocalData();

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
  if (!HAD_LOCAL_DATA) {
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
}
