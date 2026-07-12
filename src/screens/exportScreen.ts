import { esc, toast } from "../app/format";
import { buildText, buildCSV, downloadFile } from "../exports/export";
import { buildBackup, readBackupFile, APP_VERSION } from "../exports/backup";
import { CURRENT_SCHEMA_VERSION } from "../database/schema";
import { listHistory, getSessionDetail, type SessionDetail } from "../database/sessionsRepo";
import { getLastManualBackupAt, setLastManualBackupAt, completedSessionCountSinceLastBackup } from "../database/settingsRepo";
import { modalChoice } from "../components/modal";
import { go } from "../app/router";

let exportFormat: "text" | "csv" = "text";

async function loadAllSessionDetails(): Promise<SessionDetail[]> {
  const history = await listHistory();
  const details: SessionDetail[] = [];
  for (const h of history) {
    const d = await getSessionDetail(h.id);
    if (d) details.push(d);
  }
  return details;
}

function copyText(box: HTMLTextAreaElement): void {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(box.value).then(
      () => toast("Copied!"),
      () => fallbackCopy(box)
    );
    return;
  }
  fallbackCopy(box);
}

function fallbackCopy(box: HTMLTextAreaElement): void {
  try {
    box.focus();
    box.select();
    box.setSelectionRange(0, 999999);
    document.execCommand("copy") ? toast("Copied!") : toast("Select the text and copy manually");
  } catch {
    toast("Select the text and copy manually");
  }
}

async function handleDownloadBackup(): Promise<void> {
  const backup = await buildBackup();
  downloadFile(`elsupremo-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), "application/json");
  await setLastManualBackupAt(new Date().toISOString());
  toast("Backup downloaded");
}

async function handleRestore(input: HTMLInputElement, rerender: () => void): Promise<void> {
  const file = input.files?.[0];
  if (!file) return;
  const text = await file.text();
  input.value = "";
  let preview;
  try {
    preview = await readBackupFile(text);
  } catch (err) {
    toast(err instanceof Error ? err.message : "That file isn't a valid backup");
    return;
  }
  if (preview.issues.length) {
    toast("Backup failed validation — not restored");
    return;
  }
  const countsLine = Object.entries(preview.counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`)
    .join(", ");
  const choice = await modalChoice(
    preview.kind === "legacy_v15" ? "Import legacy backup?" : "Restore backup?",
    `Found: ${countsLine || "no records"}. Merge keeps your current data and adds anything new; Replace erases current data first.`,
    [
      { label: "Merge", value: "merge" },
      { label: "Replace", value: "replace", danger: true },
    ]
  );
  if (choice !== "merge" && choice !== "replace") return;

  // Pre-restore automatic backup, so a bad restore is always recoverable.
  const preRestoreBackup = await buildBackup();
  downloadFile(`elsupremo-pre-restore-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(preRestoreBackup, null, 2), "application/json");

  await preview.apply(choice);
  rerender();
  toast(choice === "replace" ? "Backup restored" : "Backup merged");
}

export async function mount(container: HTMLElement): Promise<void> {
  const rerender = () => void mount(container);
  const sessions = await loadAllSessionDetails();
  const has = sessions.length > 0;
  const content = has ? (exportFormat === "text" ? buildText(sessions) : buildCSV(sessions)) : "";
  const lastBackup = await getLastManualBackupAt();
  const sessionsSinceBackup = await completedSessionCountSinceLastBackup();
  const daysSinceBackup = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : Infinity;
  const showReminder = sessionsSinceBackup >= 10 || daysSinceBackup >= 14;

  let h = '<div style="margin-top:4px">';
  if (showReminder) {
    h += `<div class="pr-note" style="margin-bottom:14px">You haven't backed up in a while (${sessionsSinceBackup} sessions${lastBackup ? `, ${daysSinceBackup} days` : ""} since last manual backup). Consider downloading a backup below.</div>`;
  }
  if (has) {
    h += `<div class="togglerow">
      <button class="toggle ${exportFormat === "text" ? "active" : ""}" data-fmt="text">Readable text</button>
      <button class="toggle ${exportFormat === "csv" ? "active" : ""}" data-fmt="csv">Spreadsheet (CSV)</button></div>
    <div class="flexrow" style="margin-bottom:12px">
      <button class="btn" id="copyBtn">Copy</button>
      <button class="btn" id="downloadBtn">Download</button></div>
    <textarea id="exportBox" readonly class="mono" style="height:230px;font-size:11.5px;resize:vertical">${esc(content)}</textarea>`;
  } else {
    h += '<div class="empty">Once you have logged workouts, your full history appears here — ready to copy into a Claude chat or download as a file.</div>';
  }
  h += `<div class="sectionlabel">Backup</div>
    <div class="card" style="display:flex;flex-direction:column;gap:11px">
      <div class="dimtext" style="line-height:1.55">Your data is stored on this device only. Download a backup file regularly and keep it somewhere else — uninstalling the app may permanently remove locally stored workout history.</div>
      <div class="dimtext mono" style="font-size:11.5px">Last manual backup: ${lastBackup ? new Date(lastBackup).toLocaleString() : "Never"}</div>
      <button class="btn" id="downloadBackupBtn">Download backup file</button>
      <label class="btn" style="cursor:pointer">Restore from backup file
        <input type="file" accept=".json,application/json" style="display:none" id="restoreInput"></label>
      <div class="dimtext mono" style="font-size:10.5px;margin-top:4px">Schema v${CURRENT_SCHEMA_VERSION} · App v${APP_VERSION}</div>
    </div>
    <button class="btn btn-ghost" id="privacyBtn" style="margin-top:13px">Privacy Centre</button>
    </div>`;
  container.innerHTML = h;

  container.querySelectorAll<HTMLButtonElement>("[data-fmt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      exportFormat = btn.dataset.fmt as "text" | "csv";
      rerender();
    });
  });
  container.querySelector("#copyBtn")?.addEventListener("click", () => {
    const box = container.querySelector<HTMLTextAreaElement>("#exportBox");
    if (box) copyText(box);
  });
  container.querySelector("#downloadBtn")?.addEventListener("click", () => {
    downloadFile(exportFormat === "text" ? "workout-log.txt" : "workout-log.csv", exportFormat === "text" ? buildText(sessions) : buildCSV(sessions), "text/plain");
  });
  container.querySelector("#downloadBackupBtn")?.addEventListener("click", () => void handleDownloadBackup().then(rerender));
  container.querySelector("#restoreInput")?.addEventListener("change", (e) => void handleRestore(e.target as HTMLInputElement, rerender));
  container.querySelector("#privacyBtn")?.addEventListener("click", () => go("privacy"));
}
