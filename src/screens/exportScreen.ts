import { store, save, createSnapshot, recoverProtectedCopy } from "../app/store";
import { esc, toast } from "../app/format";
import { buildText, buildTSV, downloadFile } from "../exports/export";
import { modalConfirm } from "../components/modal";
import { normalizeData } from "../database/legacyStorage";
import type { AppData } from "../app/types";

let exportFormat: "text" | "tsv" = "text";

function copyExport(box: HTMLTextAreaElement): void {
  if (navigator.clipboard && navigator.clipboard.writeText) {
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

function downloadExport(): void {
  downloadFile(
    exportFormat === "text" ? "workout-log.txt" : "workout-log.tsv",
    exportFormat === "text" ? buildText(store.data) : buildTSV(store.data),
    "text/plain"
  );
}

function downloadBackup(): void {
  store.data.meta.lastManualBackupAt = new Date().toISOString();
  save("manual-backup");
  void createSnapshot("manual-backup");
  downloadFile("elsupremo-backup-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(store.data, null, 2), "application/json");
}

function restoreBackup(input: HTMLInputElement, rerender: () => void): void {
  const f = input.files?.[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const d = JSON.parse(String(r.result)) as Partial<AppData>;
      if (!d || !Array.isArray(d.templates) || !Array.isArray(d.workouts)) throw new Error("bad shape");
      const incoming = normalizeData(d);
      const ok = await modalConfirm(
        "Restore backup?",
        `${incoming.workouts.length} workouts and ${incoming.templates.length} templates will replace the data currently on this phone.`,
        "Restore"
      );
      if (!ok) return;
      await createSnapshot("before-restore");
      store.data = incoming;
      save("restore");
      await createSnapshot("restore");
      rerender();
      toast("Backup restored");
    } catch {
      toast("That file isn't a valid backup");
    }
  };
  r.readAsText(f);
  input.value = "";
}

export function mount(container: HTMLElement): void {
  const rerender = () => mount(container);
  const has = store.data.workouts.length > 0;
  const content = has ? (exportFormat === "text" ? buildText(store.data) : buildTSV(store.data)) : "";
  let h = '<div style="margin-top:4px">';
  if (has) {
    h += `<div class="togglerow">
      <button class="toggle ${exportFormat === "text" ? "active" : ""}" data-fmt="text">Readable text</button>
      <button class="toggle ${exportFormat === "tsv" ? "active" : ""}" data-fmt="tsv">Spreadsheet</button></div>
    <div class="flexrow" style="margin-bottom:12px">
      <button class="btn" id="copyBtn">Copy</button>
      <button class="btn" id="downloadBtn">Download</button></div>
    <textarea id="exportBox" readonly class="mono" style="height:230px;font-size:11.5px;resize:vertical">${esc(content)}</textarea>`;
  } else {
    h += '<div class="empty">Once you have logged workouts, your full history appears here — ready to copy into a Claude chat or download as a file.</div>';
  }
  h += `<div class="sectionlabel">Backup</div>
    <div class="card" style="display:flex;flex-direction:column;gap:11px">
      <div class="dimtext" style="line-height:1.55">Your data is saved on this phone and automatically backed up in the background after every workout. For extra safety, download a backup file occasionally and keep it somewhere else.</div>
      <button class="btn" id="downloadBackupBtn">Download backup file</button>
      <label class="btn" style="cursor:pointer">Restore from backup file
        <input type="file" accept=".json,application/json" style="display:none" id="restoreInput"></label>
      <button class="btn btn-ghost" id="recoverBtn">Restore last automatic backup</button>
    </div></div>`;
  container.innerHTML = h;

  container.querySelectorAll<HTMLButtonElement>("[data-fmt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      exportFormat = btn.dataset.fmt as "text" | "tsv";
      rerender();
    });
  });
  container.querySelector("#copyBtn")?.addEventListener("click", () => {
    const box = container.querySelector<HTMLTextAreaElement>("#exportBox");
    if (box) copyExport(box);
  });
  container.querySelector("#downloadBtn")?.addEventListener("click", downloadExport);
  container.querySelector("#downloadBackupBtn")?.addEventListener("click", downloadBackup);
  container.querySelector("#restoreInput")?.addEventListener("change", (e) => restoreBackup(e.target as HTMLInputElement, rerender));
  container.querySelector("#recoverBtn")?.addEventListener("click", () => recoverProtectedCopy(rerender));
}
