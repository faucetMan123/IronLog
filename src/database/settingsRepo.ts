// Thin, named wrappers around the generic app_settings/backup_metadata
// key-value helpers in db.ts, so call sites read as intent rather than
// raw key strings.
import { getDb, getSetting, setSetting, persistWebStore } from "./db";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed_at";
const LAST_MANUAL_BACKUP_KEY = "last_manual_backup_at";
const RIR_ENABLED_KEY = "rir_enabled";
const REST_TIMER_ENABLED_KEY = "rest_timer_enabled";
const NON_PERSONALISED_ADS_KEY = "non_personalised_ads";

export async function isOnboardingCompleted(): Promise<boolean> {
  const db = await getDb();
  return Boolean(await getSetting(db, "app_settings", ONBOARDING_COMPLETED_KEY));
}

export async function markOnboardingCompleted(): Promise<void> {
  const db = await getDb();
  await setSetting(db, "app_settings", ONBOARDING_COMPLETED_KEY, new Date().toISOString());
  await persistWebStore();
}

export async function getLastManualBackupAt(): Promise<string | null> {
  const db = await getDb();
  return getSetting(db, "backup_metadata", LAST_MANUAL_BACKUP_KEY);
}

export async function setLastManualBackupAt(iso: string): Promise<void> {
  const db = await getDb();
  await setSetting(db, "backup_metadata", LAST_MANUAL_BACKUP_KEY, iso);
  await persistWebStore();
}

export async function isRirEnabled(): Promise<boolean> {
  const db = await getDb();
  return (await getSetting(db, "app_settings", RIR_ENABLED_KEY)) === "true";
}

export async function setRirEnabled(enabled: boolean): Promise<void> {
  const db = await getDb();
  await setSetting(db, "app_settings", RIR_ENABLED_KEY, enabled ? "true" : "false");
  await persistWebStore();
}

export async function isRestTimerEnabled(): Promise<boolean> {
  const db = await getDb();
  const v = await getSetting(db, "app_settings", REST_TIMER_ENABLED_KEY);
  return v === null ? false : v === "true";
}

export async function setRestTimerEnabled(enabled: boolean): Promise<void> {
  const db = await getDb();
  await setSetting(db, "app_settings", REST_TIMER_ENABLED_KEY, enabled ? "true" : "false");
  await persistWebStore();
}

export async function getNonPersonalisedAds(): Promise<boolean> {
  const db = await getDb();
  const v = await getSetting(db, "app_settings", NON_PERSONALISED_ADS_KEY);
  return v === null ? true : v === "true"; // default to the more private option
}

export async function setNonPersonalisedAds(enabled: boolean): Promise<void> {
  const db = await getDb();
  await setSetting(db, "app_settings", NON_PERSONALISED_ADS_KEY, enabled ? "true" : "false");
  await persistWebStore();
}

export async function completedSessionCountSinceLastBackup(): Promise<number> {
  const db = await getDb();
  const lastBackup = await getLastManualBackupAt();
  const res = await db.query(`SELECT COUNT(*) as c FROM workout_sessions ${lastBackup ? "WHERE completed_at > ?" : ""}`, lastBackup ? [lastBackup] : []);
  return (res.values?.[0] as { c: number } | undefined)?.c ?? 0;
}

export async function eraseAllData(): Promise<void> {
  const db = await getDb();
  const tables = ["performed_sets", "performed_exercises", "workout_sessions", "day_exercises", "workout_days", "plans", "workout_drafts", "app_settings", "backup_metadata"];
  for (const t of tables) {
    await db.run(`DELETE FROM ${t}`);
  }
  // Custom exercises are user data too; the curated library is reference
  // data seeded by the app itself, so only custom rows are erased.
  await db.run("DELETE FROM exercises WHERE is_custom = 1");
  await persistWebStore();
}
