import { go } from "../app/router";
import { markOnboardingCompleted } from "../database/settingsRepo";
import { toast } from "../app/format";
import { readBackupFile } from "../exports/backup";
import { modalChoice } from "../components/modal";

async function handleImport(input: HTMLInputElement): Promise<void> {
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
    toast("Backup failed validation — not imported");
    return;
  }
  const choice = await modalChoice("Import backup?", "This will restore your El Supremo backup onto this device.", [{ label: "Import", value: "replace" }]);
  if (choice !== "replace") return;
  await preview.apply("replace");
  await markOnboardingCompleted();
  toast("Backup imported");
  go("home", undefined, true);
}

export function mount(container: HTMLElement): void {
  container.innerHTML = `<div style="margin-top:6px;display:flex;flex-direction:column;gap:14px">
    <div class="dimtext" style="text-align:center;line-height:1.5;margin-bottom:2px">Your workout records are stored locally on your device and are never uploaded to our servers.<br>No account. No sign-up.</div>

    <button class="card progress-option" id="mentorBtn">
      <div class="es-ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/></svg></div>
      <div style="flex:1;text-align:left">
        <div class="display" style="font-size:16px">Build with Mentor</div>
        <div class="dimtext" style="margin-top:4px;line-height:1.4">Answer a few questions, get a suggested programme.</div>
      </div>
    </button>

    <button class="card progress-option" id="manualBtn">
      <div class="es-ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
      <div style="flex:1;text-align:left">
        <div class="display" style="font-size:16px">Build My Own</div>
        <div class="dimtext" style="margin-top:4px;line-height:1.4">Create a plan and workout days manually.</div>
      </div>
    </button>

    <button class="card progress-option" id="starterBtn">
      <div class="es-ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/></svg></div>
      <div style="flex:1;text-align:left">
        <div class="display" style="font-size:16px">Use a Starter Plan</div>
        <div class="dimtext" style="margin-top:4px;line-height:1.4">Choose from a few curated programmes.</div>
      </div>
    </button>

    <button class="card progress-option" id="importBtn" style="cursor:pointer">
      <div class="es-ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg></div>
      <div style="flex:1;text-align:left">
        <div class="display" style="font-size:16px">Import Backup</div>
        <div class="dimtext" style="margin-top:4px;line-height:1.4">Restore an existing El Supremo backup file.</div>
      </div>
      <input type="file" accept=".json,application/json" style="display:none" id="importInput">
    </button>
  </div>`;

  container.querySelector("#mentorBtn")?.addEventListener("click", () => go("mentorQuestionnaire"));
  container.querySelector("#manualBtn")?.addEventListener("click", async () => {
    await markOnboardingCompleted();
    go("plans", undefined, true);
  });
  container.querySelector("#starterBtn")?.addEventListener("click", () => go("starterPlanPicker"));
  container.querySelector("#importBtn")?.addEventListener("click", () => container.querySelector<HTMLInputElement>("#importInput")?.click());
  container.querySelector("#importInput")?.addEventListener("change", (e) => void handleImport(e.target as HTMLInputElement));
}
