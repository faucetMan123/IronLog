// Legacy (v15) storage layer: localStorage["ironlog-v1"] + the
// "el-supremo-safe-store" IndexedDB mirror/snapshot system. Kept as its own
// module — unmodified in behavior from v15 — so that:
//   (a) the app keeps working exactly as before until Phase 4's SQLite
//       migration lands, and
//   (b) the Phase 4 migration can import and reuse `loadLegacy()` /
//       `latestProtectedCopy()` as its read path over old data, instead of
//       re-implementing the recovery heuristics.
// This module must never be deleted — it is the permanent rollback/read
// path for pre-migration user data (rule: old storage is never removed
// until migration is verified, and even then the raw bytes stay on disk).
import type { AppData, AppMeta, MirrorRecord, Snapshot } from "../app/types";
import { DEFAULT_TEMPLATES } from "../workouts/templates";
import { standardizeExerciseNames } from "../workouts/aliases";
import { uid } from "../app/format";

export const LS_KEY = "ironlog-v1";
export const SAFE_DB_NAME = "el-supremo-safe-store";
export const SAFE_DB_VERSION = 1;
export const SNAPSHOT_LATEST_KEY = "el-supremo-snapshot-latest";
export const SNAPSHOT_PREVIOUS_KEY = "el-supremo-snapshot-previous";

export const DEFAULT_SETTINGS = { pullupBodyweight: "" };
export const DEFAULT_META: AppMeta = {
  lastManualBackupAt: "",
  lastSnapshotAt: "",
  lastMirrorAt: "",
  persistentGranted: null,
  persistentCheckedAt: "",
  protectionStartedAt: "",
};

export function hadLocalData(): boolean {
  try {
    return !!localStorage.getItem(LS_KEY);
  } catch {
    return false;
  }
}

export function defaultData(): AppData {
  return {
    templates: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)),
    workouts: [],
    settings: { ...DEFAULT_SETTINGS },
    meta: { ...DEFAULT_META },
  };
}

export function normalizeData(d: Partial<AppData> | null | undefined): AppData {
  const base = defaultData();
  if (!d || !Array.isArray(d.templates) || !Array.isArray(d.workouts)) return base;
  const full: AppData = {
    templates: d.templates,
    workouts: d.workouts,
    settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) },
    meta: { ...DEFAULT_META, ...(d.meta || {}) },
  };
  return standardizeExerciseNames(full);
}

export function cloneData(obj: AppData): AppData {
  return JSON.parse(JSON.stringify(normalizeData(obj)));
}

export function loadLegacy(): AppData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalizeData(JSON.parse(raw));
  } catch {
    /* ignore parse/storage errors, fall through to defaults */
  }
  return defaultData();
}

export function saveLegacy(data: AppData): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    /* storage may be full or unavailable; caller decides how to surface this */
  }
}

// ---------------- IndexedDB safe store ----------------

function openSafeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(SAFE_DB_NAME, SAFE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("state")) db.createObjectStore("state");
      if (!db.objectStoreNames.contains("snapshots")) db.createObjectStore("snapshots", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB failed"));
  });
}

function idbPut<T>(storeName: string, value: T, key?: IDBValidKey): Promise<true> {
  return openSafeDB().then(
    (db) =>
      new Promise<true>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = key === undefined ? store.put(value) : store.put(value, key);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

function idbGet<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  return openSafeDB().then(
    (db) =>
      new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve((req.result as T) || null);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

function idbAllSnapshots(): Promise<Snapshot[]> {
  return openSafeDB().then(
    (db) =>
      new Promise<Snapshot[]>((resolve, reject) => {
        const tx = db.transaction("snapshots", "readonly");
        const req = tx.objectStore("snapshots").getAll();
        req.onsuccess = () => resolve((req.result as Snapshot[]) || []);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

function idbDeleteSnapshot(id: string): Promise<true> {
  return openSafeDB().then(
    (db) =>
      new Promise<true>((resolve, reject) => {
        const tx = db.transaction("snapshots", "readwrite");
        tx.objectStore("snapshots").delete(id);
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

let mirrorBusy = false;
let pendingMirrorReason: string | null = null;

export async function persistMirror(data: AppData, reason = "save"): Promise<void> {
  if (mirrorBusy) {
    pendingMirrorReason = reason;
    return;
  }
  mirrorBusy = true;
  try {
    const now = new Date().toISOString();
    const copy = cloneData(data);
    await idbPut<MirrorRecord>("state", { createdAt: now, reason, data: copy }, "latest");
    data.meta.lastMirrorAt = now;
    saveLegacy(data);
  } catch {
    /* best-effort mirror; primary save already happened via saveLegacy */
  }
  mirrorBusy = false;
  if (pendingMirrorReason) {
    const r = pendingMirrorReason;
    pendingMirrorReason = null;
    await persistMirror(data, r);
  }
}

export async function createSnapshot(data: AppData, reason = "manual"): Promise<void> {
  const now = new Date().toISOString();
  data.meta.lastSnapshotAt = now;
  const snapshot: Snapshot = { id: now + "-" + uid(), createdAt: now, reason, data: cloneData(data) };
  try {
    const prev = localStorage.getItem(SNAPSHOT_LATEST_KEY);
    if (prev) localStorage.setItem(SNAPSHOT_PREVIOUS_KEY, prev);
    localStorage.setItem(SNAPSHOT_LATEST_KEY, JSON.stringify(snapshot));
    saveLegacy(data);
  } catch {
    /* ignore */
  }
  try {
    await idbPut("snapshots", snapshot);
    const all = await idbAllSnapshots();
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    await Promise.all(all.slice(12).map((x) => idbDeleteSnapshot(x.id)));
  } catch {
    /* ignore */
  }
  await persistMirror(data, "snapshot");
}

export async function latestProtectedCopy(): Promise<Snapshot | null> {
  const candidates: Snapshot[] = [];
  try {
    const latest = localStorage.getItem(SNAPSHOT_LATEST_KEY);
    if (latest) candidates.push(JSON.parse(latest));
    const previous = localStorage.getItem(SNAPSHOT_PREVIOUS_KEY);
    if (previous) candidates.push(JSON.parse(previous));
  } catch {
    /* ignore */
  }
  try {
    const mirror = await idbGet<MirrorRecord>("state", "latest");
    if (mirror) candidates.push({ id: "mirror", createdAt: mirror.createdAt, reason: mirror.reason || "mirror", data: mirror.data });
    const snaps = await idbAllSnapshots();
    candidates.push(...snaps);
  } catch {
    /* ignore */
  }
  return (
    candidates
      .filter((x) => x && x.data && Array.isArray(x.data.workouts))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null
  );
}

export async function requestPersistentStorage(data: AppData): Promise<void> {
  const now = new Date().toISOString();
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      const granted = already || (await navigator.storage.persist());
      data.meta.persistentGranted = !!granted;
    } else {
      data.meta.persistentGranted = false;
    }
    data.meta.persistentCheckedAt = now;
    if (!data.meta.protectionStartedAt) data.meta.protectionStartedAt = now;
    saveLegacy(data);
  } catch {
    data.meta.persistentGranted = false;
    data.meta.persistentCheckedAt = now;
    saveLegacy(data);
  }
}
